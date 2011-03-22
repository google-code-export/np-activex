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
extern ITypeLib *pHtmlLib;
class CAxHost;
class FakeDispatcher :
	public IDispatch
{
public:
	virtual HRESULT STDMETHODCALLTYPE QueryInterface( 
    /* [in] */ REFIID riid,
    /* [iid_is][out] */ __RPC__deref_out void __RPC_FAR *__RPC_FAR *ppvObject);


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
			/* [out] */ __RPC__out UINT *pctinfo) {
		return E_FAIL; // doesn't support now
	}
        
	virtual HRESULT STDMETHODCALLTYPE GetTypeInfo( 
		/* [in] */ UINT iTInfo,
		/* [in] */ LCID lcid,
		/* [out] */ __RPC__deref_out_opt ITypeInfo **ppTInfo){
		return E_FAIL; // doesn't support now
	}
        
	virtual HRESULT STDMETHODCALLTYPE GetIDsOfNames( 
		/* [in] */ __RPC__in REFIID riid,
		/* [size_is][in] */ __RPC__in_ecount_full(cNames) LPOLESTR *rgszNames,
		/* [range][in] */ __RPC__in_range(0,16384) UINT cNames,
		/* [in] */ LCID lcid,
		/* [size_is][out] */ __RPC__out_ecount_full(cNames) DISPID *rgDispId){
		return E_FAIL; // doesn't support now
	}

	virtual /* [local] */ HRESULT STDMETHODCALLTYPE Invoke( 
		/* [in] */ DISPID dispIdMember,
		/* [in] */ REFIID riid,
		/* [in] */ LCID lcid,
		/* [in] */ WORD wFlags,
		/* [out][in] */ DISPPARAMS *pDispParams,
		/* [out] */ VARIANT *pVarResult,
		/* [out] */ EXCEPINFO *pExcepInfo,
		/* [out] */ UINT *puArgErr);

	NPObject *getObject() {
		return npObject;
	}

	BOOL IsValid() {
		return magic == MAGIC_NUMBER;
	}
	FakeDispatcher(NPP npInstance, ITypeLib *typeLib, NPObject *object);
	~FakeDispatcher(void);
private:
	
    const static DWORD MAGIC_NUMBER = 0xFF101243;
	NPP npInstance;
	NPObject *npObject;
	ITypeLib *typeLib;
	ITypeInfo *typeInfo;
	CAxHost *internalObj;

	HRESULT GetIndexFromDispID(DISPID dispID, INVOKEKIND invKind, UINT *index, BOOL *isVariant);
	int ref;
	DWORD magic;
};

