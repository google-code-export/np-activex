/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * Contributor:
 *                Chuan Qiu <qiuc12@gmail.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */


#include <atlstr.h>
#include "npactivex.h"
#include "scriptable.h"
#include "axhost.h"
#include "ObjectManager.h"
#include "FakeDispatcher.h"
FakeDispatcher::FakeDispatcher(NPP npInstance, ITypeLib *typeLib, NPObject *object)
	: npInstance(npInstance), typeLib(typeLib),  npObject(object), typeInfo(NULL), internalObj(NULL)
{
	magic = MAGIC_NUMBER;
	ref = 1;
	typeLib->AddRef();
	NPNFuncs.retainobject(object);
	ScriptBase *base = ObjectManager::GetInternalObject(npInstance, object);
	if (base)
		internalObj = dynamic_cast<CAxHost*>(base->host);
}

/* [local] */ HRESULT STDMETHODCALLTYPE 
	FakeDispatcher::Invoke( 
/* [in] */ DISPID dispIdMember,
/* [in] */ REFIID riid,
/* [in] */ LCID lcid,
/* [in] */ WORD wFlags,
/* [out][in] */ DISPPARAMS *pDispParams,
/* [out] */ VARIANT *pVarResult,
/* [out] */ EXCEPINFO *pExcepInfo,
/* [out] */ UINT *puArgErr) {
	if (!typeInfo) {
		return E_FAIL;
	}
	USES_CONVERSION;
	HRESULT hr = E_FAIL;
	BSTR pBstrName;
	typeInfo->GetDocumentation(dispIdMember, &pBstrName, NULL, NULL, NULL);
	LPSTR str = OLE2A(pBstrName);
	SysFreeString(pBstrName);
	NPIdentifier identifier = NPNFuncs.getstringidentifier(str);
	
	// Convert variants
	int nArgs = pDispParams->cArgs;
	NPVariant *npvars = new NPVariant[nArgs];
	for (int i = 0; i < nArgs; ++i) {
		Variant2NPVar(&pDispParams->rgvarg[nArgs - 1 - i], &npvars[i], npInstance);
	}
	NPVariant result;
	if (wFlags & DISPATCH_METHOD) {
		if (NPNFuncs.invoke(npInstance, npObject, identifier, npvars, nArgs, &result)) {
			hr = S_OK;
		}
	}
	if (!SUCCEEDED(hr) && (wFlags & DISPATCH_PROPERTYGET)) {
		if (NPNFuncs.getproperty(npInstance, npObject, identifier, &result))
			hr = S_OK;
	}
	if (!SUCCEEDED(hr) && (wFlags & DISPATCH_PROPERTYPUT)) {
		if (nArgs == 1 && NPNFuncs.setproperty(npInstance, npObject, identifier, npvars))
			hr = S_OK;
	}
	if (SUCCEEDED(hr))
		NPVar2Variant(&result, pVarResult, npInstance);
	delete [] npvars;
	return hr;
}

HRESULT STDMETHODCALLTYPE FakeDispatcher::QueryInterface( 
/* [in] */ REFIID riid,
/* [iid_is][out] */ __RPC__deref_out void __RPC_FAR *__RPC_FAR *ppvObject)
{
	HRESULT hr = E_FAIL;
	if (riid == IID_IDispatch || riid == IID_IUnknown) {
		*ppvObject = this;
		AddRef();
		hr = S_OK;
	} else if (!typeInfo) {
		hr = typeLib->GetTypeInfoOfGuid(riid, &typeInfo);
		if (SUCCEEDED(hr)) {
			*ppvObject = this;
		}
	} else {
		FakeDispatcher *another_obj = new FakeDispatcher(npInstance, typeLib, npObject);
		hr = another_obj->QueryInterface(riid, ppvObject);
	}
	if (FAILED(hr) && internalObj) {
		IUnknown *unk;
		internalObj->GetControlUnknown(&unk);
		hr = unk->QueryInterface(riid, ppvObject);
		unk->Release();
		/*			
		// Try to find the internal object
		NPIdentifier object_id = NPNFuncs.getstringidentifier(object_property);
		NPVariant npVar;

		if (NPNFuncs.getproperty(npInstance, npObject, object_id, &npVar) && npVar.type == NPVariantType_Int32) {
			IUnknown *internalObject = (IUnknown*)NPVARIANT_TO_INT32(npVar);
			hr = internalObject->QueryInterface(riid, ppvObject);
		}*/
	}
	return hr;
}

FakeDispatcher::~FakeDispatcher(void)
{
	if (typeInfo) {
		typeInfo->Release();
	}
	
	NPNFuncs.releaseobject(npObject);
	typeLib->Release();
}

HRESULT FakeDispatcher::ProcessCommand(int vfid, va_list &args)
{
	if (!typeInfo)
		return E_FAIL;
	UINT index = FindFuncByVirtualId(vfid + DISPATCH_VTABLE);
	if (index == (UINT)-1)
		return E_NOTIMPL;
	FUNCDESC *func;
	typeInfo->GetFuncDesc(index, &func);
	DISPPARAMS varlist;
	VARIANT *list = new VARIANT[func->cParams];
	varlist.cArgs = func->cParams;
	varlist.cNamedArgs = 0;
	varlist.rgdispidNamedArgs = NULL;
	varlist.rgvarg = list;
	// Thanks that there won't be any out variants in HTML.
	for (int i = 0; i < func->cParams; ++i) {
		ELEMDESC *desc = &func->lprgelemdescParam[i];
		memset(&list[i], 0, sizeof(list[i]));
		list[i].vt = desc->tdesc.vt;
		size_t varsize = VariantSize(desc->tdesc.vt);
		memcpy(&list[i].boolVal, args, varsize);
		args += (varsize + sizeof(int) - 1) & (~(sizeof(int) - 1));
	}
	VARIANT result;
	HRESULT ret = Invoke(func->memid, IID_NULL, NULL, func->invkind, &varlist, &result, NULL, NULL);

	// Provide the appropriate interface
	IUnknown *unk = result.punkVal;
	switch (func->elemdescFunc.tdesc.vt) {
	case VT_USERDEFINED:
		ITypeInfo *info;
		typeInfo->GetRefTypeInfo(func->elemdescFunc.tdesc.hreftype, &info);
		TYPEATTR *attr;
		info->GetTypeAttr(&attr);
		GUID riid;
		riid = attr->guid;
		info->ReleaseTypeAttr(attr);
		info->Release();
		break;
	default:
		ConvertVariantToGivenType(func->elemdescFunc.tdesc.vt, result, args);
		break;
	}
	delete list;
	return ret;
}

UINT FakeDispatcher::FindFuncByVirtualId(int vtbId) {
	return -1;
}