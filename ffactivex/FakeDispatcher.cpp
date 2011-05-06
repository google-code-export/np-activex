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
	NPNFuncs.getproperty(npInstance, object, NPNFuncs.getstringidentifier("name"), &npName);
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
	if (dispIdMember == 0 && (wFlags & DISPATCH_PROPERTYGET) && pDispParams->cArgs == 0) {
		// Return toString()
		static NPIdentifier strIdentify = NPNFuncs.getstringidentifier("toString");
		NPVariantProxy result;
		if (!NPNFuncs.invoke(npInstance, npObject, strIdentify, NULL, 0, &result))
			return E_FAIL;
		NPVar2Variant(&result, pVarResult, npInstance);
		return S_OK;
	}
	if (!typeInfo) {
		return E_FAIL;
	}
	USES_CONVERSION;
	HRESULT hr = E_FAIL;
	BSTR pBstrName;
	if (FAILED(typeInfo->GetDocumentation(dispIdMember, &pBstrName, NULL, NULL, NULL)))
		return E_FAIL;
	LPSTR str = OLE2A(pBstrName);
	SysFreeString(pBstrName);

	NPIdentifier identifier = NPNFuncs.getstringidentifier(str);
	// Convert variants
	int nArgs = pDispParams->cArgs;
	NPVariantProxy *npvars = new NPVariantProxy[nArgs];
	for (int i = 0; i < nArgs; ++i) {
		Variant2NPVar(&pDispParams->rgvarg[nArgs - 1 - i], &npvars[i], npInstance);
	}
	NPVariantProxy result;
	if (dispIdMember == 0 && (wFlags & DISPATCH_METHOD) && strcmp(str, "item") == 0) {
		// Item can be evaluated as the default property.
		NPIdentifier id = NULL;
		if (NPVARIANT_IS_INT32(npvars[0]))
			id = NPNFuncs.getintidentifier(npvars[0].value.intValue);
		else if (NPVARIANT_IS_STRING(npvars[0]))
			id = NPNFuncs.getstringidentifier(npvars[0].value.stringValue.UTF8Characters);
		// Because Chrome doesn't support the index in item(name, index), we'll ignore it here.
		if (id && NPNFuncs.getproperty(npInstance, npObject, id, &result))
			hr = S_OK;
	}
	if (!SUCCEEDED(hr) && (wFlags & DISPATCH_METHOD)) {
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
			TYPEATTR *attr;
			typeInfo->GetTypeAttr(&attr);
			if (!(attr->wTypeFlags & TYPEFLAG_FDISPATCHABLE)) {
				typeInfo->Release();
				hr = E_NOINTERFACE;
			} else {
				*ppvObject = static_cast<FakeDispatcher*>(this);
				AddRef();
			}
			typeInfo->ReleaseTypeAttr(attr);
		}
	} else {
		FakeDispatcher *another_obj = new FakeDispatcher(npInstance, typeLib, npObject);
		hr = another_obj->QueryInterface(riid, ppvObject);
		another_obj->Release();
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

// This function is used because the symbol of FakeDispatcher::ProcessCommand is not determined in asm file.
extern "C" HRESULT __cdecl DualProcessCommand(int parlength, int commandId, int returnAddr, FakeDispatcher *disp, ...){
	// returnAddr is a placeholder for the calling proc.
	va_list va;
	va_start(va, disp);
	// The parlength is on the stack, the modification will be reflect.
	HRESULT ret = disp->ProcessCommand(commandId, &parlength, va);
	va_end(va);
	return ret;
}

HRESULT FakeDispatcher::ProcessCommand(int vfid, int *parlength, va_list &args)
{
	ATLASSERT(this->IsValid());
	// The exception is critical if we can't find the size of parameters.
	if (!typeInfo)
		__asm int 3;
	UINT index = FindFuncByVirtualId(vfid + DISPATCH_VTABLE);
	if (index == (UINT)-1)
		__asm int 3;
	FUNCDESC *func;
	// We should count pointer of "this" first.
	*parlength = sizeof(LPVOID);
	if (FAILED(typeInfo->GetFuncDesc(index, &func)))
		__asm int 3;
	DISPPARAMS varlist;
	CComVariant *list = new CComVariant[func->cParams];
	varlist.cArgs = func->cParams;
	varlist.cNamedArgs = 0;
	varlist.rgdispidNamedArgs = NULL;
	varlist.rgvarg = list;
	// Thanks that there won't be any out variants in HTML.
	for (int i = 0; i < func->cParams; ++i) {
		int listPos = func->cParams - 1 - i;
		ELEMDESC *desc = &func->lprgelemdescParam[listPos];
		memset(&list[listPos], 0, sizeof(list[listPos]));
		RawTypeToVariant(desc->tdesc, args, &list[listPos]);
		size_t varsize = VariantSize(desc->tdesc.vt);
		size_t intvarsz = (varsize + sizeof(int) - 1) & (~(sizeof(int) - 1));
		args += intvarsz;
		*parlength += intvarsz;
	}
	// We needn't clear it.
	VARIANT result;
	HRESULT ret = Invoke(func->memid, IID_NULL, NULL, func->invkind, &varlist, &result, NULL, NULL);
	
	if (SUCCEEDED(ret))
		ret = ConvertVariantToGivenType(typeInfo, func->elemdescFunc.tdesc, result, args);

	size_t varsize = VariantSize(func->elemdescFunc.tdesc.vt);
	// It should always be a pointer. It always should be counted.
	size_t intvarsz = varsize ? sizeof(LPVOID) : 0;
	*parlength += intvarsz;
	delete[] list;
	return ret;
}

UINT FakeDispatcher::FindFuncByVirtualId(int vtbId) {
	return vtbId;
}