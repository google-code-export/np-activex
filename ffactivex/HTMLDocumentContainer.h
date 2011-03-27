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
#include "oleidl.h"
#include <npapi.h>
#include <npruntime.h>
#include "npactivex.h"
#include "objectProxy.h"
#include "FakeDispatcher.h"
class HTMLDocumentContainer :
	public IOleContainer
{
public:
	HTMLDocumentContainer(NPP instance, ITypeLib *htmlLib, NPObject *document);
	~HTMLDocumentContainer(void);
	virtual HRESULT STDMETHODCALLTYPE EnumObjects( 
		/* [in] */ DWORD grfFlags,
		/* [out] */ __RPC__deref_out_opt IEnumUnknown **ppenum) {
		return E_NOTIMPL;
	}
    virtual HRESULT STDMETHODCALLTYPE ParseDisplayName( 
		/* [unique][in] */ __RPC__in_opt IBindCtx *pbc,
		/* [in] */ __RPC__in LPOLESTR pszDisplayName,
		/* [out] */ __RPC__out ULONG *pchEaten,
		/* [out] */ __RPC__deref_out_opt IMoniker **ppmkOut) {
		return E_NOTIMPL;
	}
        
    virtual HRESULT STDMETHODCALLTYPE LockContainer( 
		/* [in] */ BOOL fLock) {
		return E_NOTIMPL;
	}
	virtual HRESULT STDMETHODCALLTYPE QueryInterface( 
        /* [in] */ REFIID riid,
        /* [iid_is][out] */ __RPC__deref_out void __RPC_FAR *__RPC_FAR *ppvObject) {
		if (riid == IID_IOleContainer || riid == IID_IParseDisplayName || riid == IID_IUnknown)
		{
			*ppvObject = (void*)this;
			AddRef();
			return S_OK;
		}
		return dispacher->QueryInterface(riid, ppvObject);
	}

    virtual ULONG STDMETHODCALLTYPE AddRef( void) {
		return dispacher->AddRef();
	}

    virtual ULONG STDMETHODCALLTYPE Release( void) {
		ULONG ret = dispacher->Release();
		if (!ret)
			delete this;
		return ret;
	}

private:
	
	FakeDispatcher *dispacher;
	NPObjectProxy document_;
};

