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

// {1DDBD54F-2F8A-4186-972B-2A84FE1135FE}
static const GUID IID_IFakeDispatcher = 
{ 0x1ddbd54f, 0x2f8a, 0x4186, { 0x97, 0x2b, 0x2a, 0x84, 0xfe, 0x11, 0x35, 0xfe } };

ITypeInfo* FakeDispatcher::npTypeInfo = (ITypeInfo*)-1;

#define DispatchLog(level, message, ...) np_log(this->npInstance, level, "Disp 0x%08x " message, this, ##__VA_ARGS__)

FakeDispatcher::FakeDispatcher(NPP npInstance, ITypeLib *typeLib, NPObject *object)
	: npInstance(npInstance), typeLib(typeLib),  npObject(object), typeInfo(NULL), internalObj(NULL), extended(NULL)
{
	ref = 1;
	typeLib->AddRef();
	NPNFuncs.retainobject(object);
	
	ScriptBase *base = ObjectManager::GetInternalObject(npInstance, object);
	if (base)
		internalObj = dynamic_cast<CAxHost*>(base->host);

#ifdef DEBUG
	name[0] = 0;
	tag[0] = 0;
	interfaceid = GUID_NULL;
#endif

	NPVariantProxy npName, npTag;
	ATL::CStringA sname, stag;
	NPNFuncs.getproperty(npInstance, object, NPNFuncs.getstringidentifier("id"), &npName);
	if (npName.type != NPVariantType_String || npName.value.stringValue.UTF8Length == 0)
		NPNFuncs.getproperty(npInstance, object, NPNFuncs.getstringidentifier("name"), &npName);
	if (npName.type == NPVariantType_String) {
		sname = CStringA(npName.value.stringValue.UTF8Characters, npName.value.stringValue.UTF8Length);
#ifdef DEBUG
		strncpy(name, npName.value.stringValue.UTF8Characters, npName.value.stringValue.UTF8Length);
		name[npName.value.stringValue.UTF8Length] = 0;
#endif
	}
	if (NPNFuncs.hasmethod(npInstance, object, NPNFuncs.getstringidentifier("toString"))) {
		NPNFuncs.invoke(npInstance, object, NPNFuncs.getstringidentifier("toString"), &npTag, 0, &npTag);
		if (npTag.type == NPVariantType_String) {
			stag = CStringA(npTag.value.stringValue.UTF8Characters, npTag.value.stringValue.UTF8Length);
#ifdef DEBUG
			strncpy(tag, npTag.value.stringValue.UTF8Characters, npTag.value.stringValue.UTF8Length);
			tag[npTag.value.stringValue.UTF8Length] = 0;
#endif
		}
	}
	DispatchLog(1, "Type: %s, Name: %s", stag.GetString(), sname.GetString());
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

	USES_CONVERSION;
	
	// Convert variants
	int nArgs = pDispParams->cArgs;
	NPVariantProxy *npvars = new NPVariantProxy[nArgs];
	for (int i = 0; i < nArgs; ++i) {
		Variant2NPVar(&pDispParams->rgvarg[nArgs - 1 - i], &npvars[i], npInstance);
	}

	// Determine method to call.
	HRESULT hr = E_FAIL;
	BSTR pBstrName;
	
	NPVariantProxy result;
	NPIdentifier identifier = NULL;
	NPIdentifier itemIdentifier = NULL;
	if (HasValidTypeInfo() && SUCCEEDED(typeInfo->GetDocumentation(dispIdMember, &pBstrName, NULL, NULL, NULL))) {
		LPSTR str = OLE2A(pBstrName);
		SysFreeString(pBstrName);
		DispatchLog(2, "Invoke 0x%08x %d %s", dispIdMember, wFlags, str);
		
		if (dispIdMember == 0x401 && strcmp(str, "url") == 0) {
			str = "baseURI";
		} else if (dispIdMember == 0x40A && strcmp(str, "parentWindow") == 0) {
			str = "defaultView";
		}

		identifier = NPNFuncs.getstringidentifier(str);

		if (dispIdMember == 0 && (wFlags & DISPATCH_METHOD) && strcmp(str, "item") == 0) {
			// Item can be evaluated as the default property.
			if (NPVARIANT_IS_INT32(npvars[0]))
				itemIdentifier = NPNFuncs.getintidentifier(npvars[0].value.intValue);
			else if (NPVARIANT_IS_STRING(npvars[0]))
				itemIdentifier = NPNFuncs.getstringidentifier(npvars[0].value.stringValue.UTF8Characters);
		}
		else if (dispIdMember == 0x3E9 && (wFlags & DISPATCH_PROPERTYGET) && strcmp(str, "Script") == 0) {
			identifier = NPNFuncs.getstringidentifier("defaultView");
		}
	}
	else if (typeInfo == npTypeInfo && dispIdMember != NULL && dispIdMember != -1) {
		identifier = (NPIdentifier) dispIdMember;
	}

	if (FAILED(hr) && itemIdentifier != NULL) {
		if (NPNFuncs.hasproperty(npInstance, npObject, itemIdentifier)) {
			if (NPNFuncs.getproperty(npInstance, npObject, itemIdentifier, &result)) {
				hr = S_OK;
			}
		}
	}

	if (FAILED(hr) && (wFlags & DISPATCH_METHOD)) {
		if (NPNFuncs.invoke(npInstance, npObject, identifier, npvars, nArgs, &result)) {
			hr = S_OK;
		}
	}

	if (FAILED(hr) && (wFlags & DISPATCH_PROPERTYGET)) {
		if (NPNFuncs.hasproperty(npInstance, npObject, identifier)) {
			if (NPNFuncs.getproperty(npInstance, npObject, identifier, &result)) {
				hr = S_OK;
			}
		}
	}

	if (FAILED(hr) && (wFlags & DISPATCH_PROPERTYPUT)) {
		if (nArgs == 1 && NPNFuncs.setproperty(npInstance, npObject, identifier, npvars))
			hr = S_OK;
	}

	if (FAILED(hr) && dispIdMember == 0 && (wFlags & DISPATCH_METHOD)) {
		// Call default method.
		if (NPNFuncs.invokeDefault(npInstance, npObject, npvars, nArgs, &result)) {
			hr = S_OK;
		}
	}
	
	if (FAILED(hr) && dispIdMember == 0 && (wFlags & DISPATCH_PROPERTYGET) && pDispParams->cArgs == 0) {
		// Return toString()
		static NPIdentifier strIdentify = NPNFuncs.getstringidentifier("toString");
		if (NPNFuncs.invoke(npInstance, npObject, strIdentify, NULL, 0, &result))
			hr = S_OK;
	}

	if (SUCCEEDED(hr)) {
		NPVar2Variant(&result, pVarResult, npInstance);
	} else {
		DispatchLog(2, "Invoke failed 0x%08x %d", dispIdMember, wFlags);
	}
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
	} else if (riid == IID_IDispatchEx) {
		if (extended == NULL)
			extended = new FakeDispatcherEx(this);
		*ppvObject = extended;
		AddRef();
		hr = S_OK;
	} else if (riid == IID_IFakeDispatcher) {
		*ppvObject = this;
		AddRef();
		hr = S_OK;
	} else if (!typeInfo) {
		hr = typeLib->GetTypeInfoOfGuid(riid, &typeInfo);
		if (SUCCEEDED(hr)) {
			TYPEATTR *attr;
			typeInfo->GetTypeAttr(&attr);
			dualType = attr->wTypeFlags;
			*ppvObject = static_cast<FakeDispatcher*>(this);
			AddRef();
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
#ifdef DEBUG
	if (hr == S_OK) {
		interfaceid = riid;
	} else {
		// Unsupported Interface!
	}
#endif
	USES_CONVERSION;
	LPOLESTR clsid;
	StringFromCLSID(riid, &clsid);

	if (FAILED(hr)) {
		DispatchLog(0, "Unsupported Interface %s", OLE2A(clsid)); 
	} else {
		DispatchLog(0, "QueryInterface %s", OLE2A(clsid));
	}
	return hr;
}

FakeDispatcher::~FakeDispatcher(void)
{
	if (HasValidTypeInfo()) {
		typeInfo->Release();
	}
	if (extended) {
		delete extended;
	}
	
	DispatchLog(3, "Release");
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

HRESULT FakeDispatcher::GetTypeInfo( 
	/* [in] */ UINT iTInfo,
	/* [in] */ LCID lcid,
	/* [out] */ __RPC__deref_out_opt ITypeInfo **ppTInfo) {
	if (iTInfo == 0 && HasValidTypeInfo()) {
		*ppTInfo = typeInfo;
		typeInfo->AddRef();
		return S_OK;
	}
	return E_INVALIDARG;
}

HRESULT FakeDispatcher::GetIDsOfNames( 
	/* [in] */ __RPC__in REFIID riid,
	/* [size_is][in] */ __RPC__in_ecount_full(cNames) LPOLESTR *rgszNames,
	/* [range][in] */ __RPC__in_range(0,16384) UINT cNames,
	/* [in] */ LCID lcid,
	/* [size_is][out] */ __RPC__out_ecount_full(cNames) DISPID *rgDispId){
	if (HasValidTypeInfo()) {
		return typeInfo->GetIDsOfNames(rgszNames, cNames, rgDispId);
	} else {
		USES_CONVERSION;
		typeInfo = npTypeInfo;
		for (UINT i = 0; i < cNames; ++i) {
			DispatchLog(2, "GetIDsOfNames %s", OLE2A(rgszNames[i]));
			rgDispId[i] = (DISPID) NPNFuncs.getstringidentifier(OLE2A(rgszNames[i]));
		}
		return S_OK;
	}
}

HRESULT FakeDispatcher::ProcessCommand(int vfid, int *parlength, va_list &args)
{
	// This exception is critical if we can't find the size of parameters.
	if (!HasValidTypeInfo())
		__asm int 3;
	UINT index = FindFuncByVirtualId(vfid);
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
	// We needn't clear it. Caller takes ownership.
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
	if (dualType & TYPEFLAG_FDUAL)
		return vtbId + DISPATCH_VTABLE;
	else
		return vtbId;
}

bool FakeDispatcher::HasValidTypeInfo() {
	return typeInfo && typeInfo != npTypeInfo;
}

HRESULT STDMETHODCALLTYPE FakeDispatcher::FakeDispatcherEx::GetDispID( 
    __RPC__in BSTR bstrName,
    DWORD grfdex,
    __RPC__out DISPID *pid) {
	return LogNotImplemented(target->npInstance);
}

HRESULT STDMETHODCALLTYPE FakeDispatcher::FakeDispatcherEx::InvokeEx( 
    __in  DISPID id,
    __in  LCID lcid,
    __in  WORD wFlags,
    __in  DISPPARAMS *pdp,
    __out_opt  VARIANT *pvarRes,
    __out_opt  EXCEPINFO *pei,
    __in_opt  IServiceProvider *pspCaller) {
	return LogNotImplemented(target->npInstance);
}

HRESULT STDMETHODCALLTYPE FakeDispatcher::FakeDispatcherEx::DeleteMemberByName( 
	__RPC__in BSTR bstrName,
	DWORD grfdex) {
	return LogNotImplemented(target->npInstance);
}

HRESULT STDMETHODCALLTYPE FakeDispatcher::FakeDispatcherEx::DeleteMemberByDispID(DISPID id) {
	return LogNotImplemented(target->npInstance);
}

HRESULT STDMETHODCALLTYPE FakeDispatcher::FakeDispatcherEx::GetMemberProperties(
	DISPID id,
	DWORD grfdexFetch,
	__RPC__out DWORD *pgrfdex) {
	return LogNotImplemented(target->npInstance);
}

HRESULT STDMETHODCALLTYPE FakeDispatcher::FakeDispatcherEx::GetMemberName( 
	DISPID id,
	__RPC__deref_out_opt BSTR *pbstrName) {
	return LogNotImplemented(target->npInstance);
}

HRESULT STDMETHODCALLTYPE FakeDispatcher::FakeDispatcherEx::GetNextDispID( 
	DWORD grfdex,
	DISPID id,
	__RPC__out DISPID *pid) {
	return LogNotImplemented(target->npInstance);
}

HRESULT STDMETHODCALLTYPE FakeDispatcher::FakeDispatcherEx::GetNameSpaceParent( 
	__RPC__deref_out_opt IUnknown **ppunk) {
	return LogNotImplemented(target->npInstance);
}
