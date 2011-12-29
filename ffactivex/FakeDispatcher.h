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


#pragma once

#include <Windows.h>
#include <OleAuto.h>

#include <npapi.h>
#include <npruntime.h>
#include "FakeDispatcherBase.h"
#include "objectProxy.h"
extern ITypeLib *pHtmlLib;
class CAxHost;

EXTERN_C const IID IID_IFakeDispatcher;

class FakeDispatcher :
	public FakeDispatcherBase
{
private:
	class FakeDispatcherEx: IDispatchEx {
	private:
		FakeDispatcher *target;
	public:
		FakeDispatcherEx(FakeDispatcher *target) : target(target) {
		}

		virtual HRESULT STDMETHODCALLTYPE QueryInterface( 
		REFIID riid,
    	__RPC__deref_out void __RPC_FAR *__RPC_FAR *ppvObject) {
			return target->QueryInterface(riid, ppvObject);
		}

		virtual ULONG STDMETHODCALLTYPE AddRef( void) {
			return target->AddRef();
		}

		virtual ULONG STDMETHODCALLTYPE Release( void) {
			return target->Release();
		}

		virtual HRESULT STDMETHODCALLTYPE GetTypeInfoCount( 
			__RPC__out UINT *pctinfo) {
			return target->GetTypeInfoCount(pctinfo);
		}

		virtual HRESULT STDMETHODCALLTYPE GetTypeInfo( 
			UINT iTInfo,
			LCID lcid,
			__RPC__deref_out_opt ITypeInfo **ppTInfo) {
			return target->GetTypeInfo(iTInfo, lcid, ppTInfo);
		}

		virtual HRESULT STDMETHODCALLTYPE GetIDsOfNames( 
			__RPC__in REFIID riid,
			__RPC__in_ecount_full(cNames) LPOLESTR *rgszNames,
			__RPC__in_range(0,16384) UINT cNames,
			LCID lcid,
			__RPC__out_ecount_full(cNames) DISPID *rgDispId) {
			return target->GetIDsOfNames(riid, rgszNames, cNames, lcid, rgDispId);
		}

		virtual HRESULT STDMETHODCALLTYPE Invoke( 
			DISPID dispIdMember,
			REFIID riid,
			LCID lcid,
			WORD wFlags,
			DISPPARAMS *pDispParams,
			VARIANT *pVarResult,
			EXCEPINFO *pExcepInfo,
			UINT *puArgErr) {
			return target->Invoke(dispIdMember, riid, lcid, wFlags, pDispParams, pVarResult, pExcepInfo, puArgErr);
		}

		virtual HRESULT STDMETHODCALLTYPE GetDispID( 
			__RPC__in BSTR bstrName,
			DWORD grfdex,
			__RPC__out DISPID *pid);
        
		virtual HRESULT STDMETHODCALLTYPE InvokeEx( 
			__in  DISPID id,
			__in  LCID lcid,
			__in  WORD wFlags,
			__in  DISPPARAMS *pdp,
			__out_opt  VARIANT *pvarRes,
			__out_opt  EXCEPINFO *pei,
			__in_opt  IServiceProvider *pspCaller);
        
		virtual HRESULT STDMETHODCALLTYPE DeleteMemberByName( 
			__RPC__in BSTR bstrName,
			DWORD grfdex);
        
		virtual HRESULT STDMETHODCALLTYPE DeleteMemberByDispID(DISPID id);
        
		virtual HRESULT STDMETHODCALLTYPE GetMemberProperties( 
			DISPID id,
			DWORD grfdexFetch,
			__RPC__out DWORD *pgrfdex);
        
		virtual HRESULT STDMETHODCALLTYPE GetMemberName( 
			DISPID id,
			__RPC__deref_out_opt BSTR *pbstrName);
        
		virtual HRESULT STDMETHODCALLTYPE GetNextDispID( 
			DWORD grfdex,
			DISPID id,
			__RPC__out DISPID *pid);
        
		virtual HRESULT STDMETHODCALLTYPE GetNameSpaceParent( 
			__RPC__deref_out_opt IUnknown **ppunk);
        
	};

public:
	virtual HRESULT STDMETHODCALLTYPE QueryInterface( 
		REFIID riid,
    	__RPC__deref_out void __RPC_FAR *__RPC_FAR *ppvObject);

    virtual ULONG STDMETHODCALLTYPE AddRef( void) {
		++ref;
		return ref;
	}

    virtual ULONG STDMETHODCALLTYPE Release( void) {
		--ref;
		if (ref == 0)
			delete this;
		return ref;
	}

	virtual HRESULT STDMETHODCALLTYPE GetTypeInfoCount( 
		__RPC__out UINT *pctinfo) {
		*pctinfo = 1;
		return S_OK;
	}

	virtual HRESULT STDMETHODCALLTYPE GetTypeInfo( 
		UINT iTInfo,
		LCID lcid,
		__RPC__deref_out_opt ITypeInfo **ppTInfo);

	virtual HRESULT STDMETHODCALLTYPE GetIDsOfNames( 
		__RPC__in REFIID riid,
		__RPC__in_ecount_full(cNames) LPOLESTR *rgszNames,
		__RPC__in_range(0,16384) UINT cNames,
		LCID lcid,
		__RPC__out_ecount_full(cNames) DISPID *rgDispId);

	virtual HRESULT STDMETHODCALLTYPE Invoke( 
		DISPID dispIdMember,
		REFIID riid,
		LCID lcid,
		WORD wFlags,
		DISPPARAMS *pDispParams,
		VARIANT *pVarResult,
		EXCEPINFO *pExcepInfo,
		UINT *puArgErr);

	NPObject *getObject() {
		return npObject;
	}

	FakeDispatcher(NPP npInstance, ITypeLib *typeLib, NPObject *object);
	~FakeDispatcher(void);
	
	HRESULT ProcessCommand(int ID, int *parlength,va_list &list);
	//friend HRESULT __cdecl DualProcessCommand(int parlength, int commandId, FakeDispatcher *disp, ...);
private:
	static ITypeInfo* npTypeInfo;
	const static int DISPATCH_VTABLE = 7;
	FakeDispatcherEx *extended;
	NPP npInstance;
	NPObject *npObject;
	ITypeLib *typeLib;
	ITypeInfo *typeInfo;
	CAxHost *internalObj;

	bool HasValidTypeInfo();

	int ref;
	DWORD dualType;
#ifdef DEBUG
	char name[50];
	char tag[100];
	GUID interfaceid;
#endif

	UINT FindFuncByVirtualId(int vtbId);
};

