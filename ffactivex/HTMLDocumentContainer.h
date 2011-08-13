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
	public CComObjectRoot,
	public IOleContainer,
	public IServiceProviderImpl<HTMLDocumentContainer>,
	public IWebBrowser2
{
public:
	HTMLDocumentContainer();
	void Init(NPP instance, ITypeLib *htmlLib);
	~HTMLDocumentContainer(void);
	HRESULT notimpl() {
		return E_NOTIMPL;
	}
// IOleContainer
	virtual HRESULT STDMETHODCALLTYPE EnumObjects( 
		/* [in] */ DWORD grfFlags,
		/* [out] */ __RPC__deref_out_opt IEnumUnknown **ppenum) {
		return notimpl();
	}
    virtual HRESULT STDMETHODCALLTYPE ParseDisplayName( 
		/* [unique][in] */ __RPC__in_opt IBindCtx *pbc,
		/* [in] */ __RPC__in LPOLESTR pszDisplayName,
		/* [out] */ __RPC__out ULONG *pchEaten,
		/* [out] */ __RPC__deref_out_opt IMoniker **ppmkOut) {
		return notimpl();
	}
        
    virtual HRESULT STDMETHODCALLTYPE LockContainer( 
		/* [in] */ BOOL fLock) {
		return notimpl();
	}

	// IWebBrowser2
	virtual /* [helpcontext][helpstring][id] */ HRESULT STDMETHODCALLTYPE Navigate2( 
            /* [in] */ __RPC__in VARIANT *URL,
            /* [unique][optional][in] */ __RPC__in_opt VARIANT *Flags,
            /* [unique][optional][in] */ __RPC__in_opt VARIANT *TargetFrameName,
            /* [unique][optional][in] */ __RPC__in_opt VARIANT *PostData,
            /* [unique][optional][in] */ __RPC__in_opt VARIANT *Headers) {return notimpl();};
        
    virtual /* [helpcontext][helpstring][id] */ HRESULT STDMETHODCALLTYPE QueryStatusWB( 
        /* [in] */ OLECMDID cmdID,
        /* [retval][out] */ __RPC__out OLECMDF *pcmdf) {return notimpl();};
        
    virtual /* [helpcontext][helpstring][id] */ HRESULT STDMETHODCALLTYPE ExecWB( 
        /* [in] */ OLECMDID cmdID,
        /* [in] */ OLECMDEXECOPT cmdexecopt,
        /* [unique][optional][in] */ __RPC__in_opt VARIANT *pvaIn,
        /* [unique][optional][out][in] */ __RPC__inout_opt VARIANT *pvaOut) {return notimpl();};
        
    virtual /* [helpcontext][helpstring][id] */ HRESULT STDMETHODCALLTYPE ShowBrowserBar( 
        /* [in] */ __RPC__in VARIANT *pvaClsid,
        /* [unique][optional][in] */ __RPC__in_opt VARIANT *pvarShow,
        /* [unique][optional][in] */ __RPC__in_opt VARIANT *pvarSize) {return notimpl();};
        
    virtual /* [bindable][propget][id] */ HRESULT STDMETHODCALLTYPE get_ReadyState( 
        /* [out][retval] */ __RPC__out READYSTATE *plReadyState) {return notimpl();};
        
    virtual /* [helpcontext][helpstring][propget][id] */ HRESULT STDMETHODCALLTYPE get_Offline( 
        /* [retval][out] */ __RPC__out VARIANT_BOOL *pbOffline) {return notimpl();};
        
    virtual /* [helpcontext][helpstring][propput][id] */ HRESULT STDMETHODCALLTYPE put_Offline( 
        /* [in] */ VARIANT_BOOL bOffline) {return notimpl();};
        
    virtual /* [helpcontext][helpstring][propget][id] */ HRESULT STDMETHODCALLTYPE get_Silent( 
        /* [retval][out] */ __RPC__out VARIANT_BOOL *pbSilent) {return notimpl();};
        
    virtual /* [helpcontext][helpstring][propput][id] */ HRESULT STDMETHODCALLTYPE put_Silent( 
        /* [in] */ VARIANT_BOOL bSilent) {return notimpl();};
        
    virtual /* [helpcontext][helpstring][propget][id] */ HRESULT STDMETHODCALLTYPE get_RegisterAsBrowser( 
        /* [retval][out] */ __RPC__out VARIANT_BOOL *pbRegister) {return notimpl();};
        
    virtual /* [helpcontext][helpstring][propput][id] */ HRESULT STDMETHODCALLTYPE put_RegisterAsBrowser( 
        /* [in] */ VARIANT_BOOL bRegister) {return notimpl();};
        
    virtual /* [helpcontext][helpstring][propget][id] */ HRESULT STDMETHODCALLTYPE get_RegisterAsDropTarget( 
        /* [retval][out] */ __RPC__out VARIANT_BOOL *pbRegister) {return notimpl();};
        
    virtual /* [helpcontext][helpstring][propput][id] */ HRESULT STDMETHODCALLTYPE put_RegisterAsDropTarget( 
        /* [in] */ VARIANT_BOOL bRegister) {return notimpl();};
        
    virtual /* [helpcontext][helpstring][propget][id] */ HRESULT STDMETHODCALLTYPE get_TheaterMode( 
        /* [retval][out] */ __RPC__out VARIANT_BOOL *pbRegister) {return notimpl();};
        
    virtual /* [helpcontext][helpstring][propput][id] */ HRESULT STDMETHODCALLTYPE put_TheaterMode( 
        /* [in] */ VARIANT_BOOL bRegister) {return notimpl();};
        
    virtual /* [helpcontext][helpstring][propget][id] */ HRESULT STDMETHODCALLTYPE get_AddressBar( 
        /* [retval][out] */ __RPC__out VARIANT_BOOL *Value) {*Value = True;return notimpl();};
        
    virtual /* [helpcontext][helpstring][propput][id] */ HRESULT STDMETHODCALLTYPE put_AddressBar( 
        /* [in] */ VARIANT_BOOL Value) {return notimpl();};
        
    virtual /* [helpcontext][helpstring][propget][id] */ HRESULT STDMETHODCALLTYPE get_Resizable( 
        /* [retval][out] */ __RPC__out VARIANT_BOOL *Value) {return notimpl();};
        
    virtual /* [helpcontext][helpstring][propput][id] */ HRESULT STDMETHODCALLTYPE put_Resizable( 
        /* [in] */ VARIANT_BOOL Value) {return notimpl();};
    virtual /* [helpcontext][helpstring][id] */ HRESULT STDMETHODCALLTYPE Quit( void) {return notimpl();};
        
    virtual /* [helpcontext][helpstring][id] */ HRESULT STDMETHODCALLTYPE ClientToWindow( 
        /* [out][in] */ __RPC__inout int *pcx,
        /* [out][in] */ __RPC__inout int *pcy) {return notimpl();};
        
    virtual /* [helpcontext][helpstring][id] */ HRESULT STDMETHODCALLTYPE PutProperty( 
        /* [in] */ __RPC__in BSTR Property,
        /* [in] */ VARIANT vtValue) {return notimpl();};
        
    virtual /* [helpcontext][helpstring][id] */ HRESULT STDMETHODCALLTYPE GetProperty( 
        /* [in] */ __RPC__in BSTR Property,
        /* [retval][out] */ __RPC__out VARIANT *pvtValue) {return notimpl();};
        
    virtual /* [helpcontext][helpstring][propget][id] */ HRESULT STDMETHODCALLTYPE get_Name( 
        /* [retval][out] */ __RPC__deref_out_opt BSTR *Name) {return notimpl();};
        
    virtual /* [helpcontext][helpstring][propget][id] */ HRESULT STDMETHODCALLTYPE get_HWND( 
        /* [retval][out] */ __RPC__out SHANDLE_PTR *pHWND) {return notimpl();};
        
    virtual /* [helpcontext][helpstring][propget][id] */ HRESULT STDMETHODCALLTYPE get_FullName( 
        /* [retval][out] */ __RPC__deref_out_opt BSTR *FullName) {return notimpl();};
        
    virtual /* [helpcontext][helpstring][propget][id] */ HRESULT STDMETHODCALLTYPE get_Path( 
        /* [retval][out] */ __RPC__deref_out_opt BSTR *Path) {return notimpl();};
        
    virtual /* [helpcontext][helpstring][propget][id] */ HRESULT STDMETHODCALLTYPE get_Visible( 
        /* [retval][out] */ __RPC__out VARIANT_BOOL *pBool) {return notimpl();};
        
    virtual /* [helpcontext][helpstring][propput][id] */ HRESULT STDMETHODCALLTYPE put_Visible( 
        /* [in] */ VARIANT_BOOL Value) {return notimpl();};
        
    virtual /* [helpcontext][helpstring][propget][id] */ HRESULT STDMETHODCALLTYPE get_StatusBar( 
        /* [retval][out] */ __RPC__out VARIANT_BOOL *pBool) {return notimpl();};
        
    virtual /* [helpcontext][helpstring][propput][id] */ HRESULT STDMETHODCALLTYPE put_StatusBar( 
        /* [in] */ VARIANT_BOOL Value) {return notimpl();};
        
    virtual /* [helpcontext][helpstring][propget][id] */ HRESULT STDMETHODCALLTYPE get_StatusText( 
        /* [retval][out] */ __RPC__deref_out_opt BSTR *StatusText) {return notimpl();};
        
    virtual /* [helpcontext][helpstring][propput][id] */ HRESULT STDMETHODCALLTYPE put_StatusText( 
        /* [in] */ __RPC__in BSTR StatusText) {return notimpl();};
        
    virtual /* [helpcontext][helpstring][propget][id] */ HRESULT STDMETHODCALLTYPE get_ToolBar( 
        /* [retval][out] */ __RPC__out int *Value) {return notimpl();};
        
    virtual /* [helpcontext][helpstring][propput][id] */ HRESULT STDMETHODCALLTYPE put_ToolBar( 
        /* [in] */ int Value) {return notimpl();};
        
    virtual /* [helpcontext][helpstring][propget][id] */ HRESULT STDMETHODCALLTYPE get_MenuBar( 
        /* [retval][out] */ __RPC__out VARIANT_BOOL *Value) {return notimpl();};
        
    virtual /* [helpcontext][helpstring][propput][id] */ HRESULT STDMETHODCALLTYPE put_MenuBar( 
        /* [in] */ VARIANT_BOOL Value) {return notimpl();};
        
    virtual /* [helpcontext][helpstring][propget][id] */ HRESULT STDMETHODCALLTYPE get_FullScreen( 
        /* [retval][out] */ __RPC__out VARIANT_BOOL *pbFullScreen) {*pbFullScreen = FALSE; return notimpl();};
        
    virtual /* [helpcontext][helpstring][propput][id] */ HRESULT STDMETHODCALLTYPE put_FullScreen( 
        /* [in] */ VARIANT_BOOL bFullScreen) {return notimpl();};
	virtual /* [helpcontext][helpstring][id] */ HRESULT STDMETHODCALLTYPE GoBack( void) {return notimpl();}
        
    virtual /* [helpcontext][helpstring][id] */ HRESULT STDMETHODCALLTYPE GoForward( void) {return notimpl();}
        
    virtual /* [helpcontext][helpstring][id] */ HRESULT STDMETHODCALLTYPE GoHome( void) {return notimpl();}
        
    virtual /* [helpcontext][helpstring][id] */ HRESULT STDMETHODCALLTYPE GoSearch( void) {return notimpl();}
        
    virtual /* [helpcontext][helpstring][id] */ HRESULT STDMETHODCALLTYPE Navigate( 
        /* [in] */ __RPC__in BSTR URL,
        /* [unique][optional][in] */ __RPC__in_opt VARIANT *Flags,
        /* [unique][optional][in] */ __RPC__in_opt VARIANT *TargetFrameName,
        /* [unique][optional][in] */ __RPC__in_opt VARIANT *PostData,
        /* [unique][optional][in] */ __RPC__in_opt VARIANT *Headers) {return notimpl();}
        
    virtual /* [helpcontext][helpstring][id] */ HRESULT STDMETHODCALLTYPE Refresh( void) {return notimpl();}
        
    virtual /* [helpcontext][helpstring][id] */ HRESULT STDMETHODCALLTYPE Refresh2( 
        /* [unique][optional][in] */ __RPC__in_opt VARIANT *Level) {return notimpl();}
        
    virtual /* [helpcontext][helpstring][id] */ HRESULT STDMETHODCALLTYPE Stop( void) {return notimpl();}
        
    virtual /* [helpcontext][helpstring][propget][id] */ HRESULT STDMETHODCALLTYPE get_Application( 
        /* [retval][out] */ __RPC__deref_out_opt IDispatch **ppDisp) {return notimpl();}
        
    virtual /* [helpcontext][helpstring][propget][id] */ HRESULT STDMETHODCALLTYPE get_Parent( 
        /* [retval][out] */ __RPC__deref_out_opt IDispatch **ppDisp) {return notimpl();}
        
    virtual /* [helpcontext][helpstring][propget][id] */ HRESULT STDMETHODCALLTYPE get_Container( 
        /* [retval][out] */ __RPC__deref_out_opt IDispatch **ppDisp) {return notimpl();}
        
    virtual /* [helpcontext][helpstring][propget][id] */ HRESULT STDMETHODCALLTYPE get_Document( 
        /* [retval][out] */ __RPC__deref_out_opt IDispatch **ppDisp);
        
    virtual /* [helpcontext][helpstring][propget][id] */ HRESULT STDMETHODCALLTYPE get_TopLevelContainer( 
        /* [retval][out] */ __RPC__out VARIANT_BOOL *pBool) {return notimpl();}
        
    virtual /* [helpcontext][helpstring][propget][id] */ HRESULT STDMETHODCALLTYPE get_Type( 
        /* [retval][out] */ __RPC__deref_out_opt BSTR *Type) {return notimpl();}
        
    virtual /* [helpcontext][helpstring][propget][id] */ HRESULT STDMETHODCALLTYPE get_Left( 
        /* [retval][out] */ __RPC__out long *pl) {return notimpl();}
        
    virtual /* [propput][id] */ HRESULT STDMETHODCALLTYPE put_Left( 
        /* [in] */ long Left) {return notimpl();}
        
    virtual /* [helpcontext][helpstring][propget][id] */ HRESULT STDMETHODCALLTYPE get_Top( 
        /* [retval][out] */ __RPC__out long *pl) {return notimpl();}
        
    virtual /* [propput][id] */ HRESULT STDMETHODCALLTYPE put_Top( 
        /* [in] */ long Top) {return notimpl();}
        
    virtual /* [helpcontext][helpstring][propget][id] */ HRESULT STDMETHODCALLTYPE get_Width( 
        /* [retval][out] */ __RPC__out long *pl) {return notimpl();}
        
    virtual /* [propput][id] */ HRESULT STDMETHODCALLTYPE put_Width( 
        /* [in] */ long Width) {return notimpl();}
        
    virtual /* [helpcontext][helpstring][propget][id] */ HRESULT STDMETHODCALLTYPE get_Height( 
        /* [retval][out] */ __RPC__out long *pl) {return notimpl();}
        
    virtual /* [propput][id] */ HRESULT STDMETHODCALLTYPE put_Height( 
        /* [in] */ long Height) {return notimpl();}
        
    virtual /* [helpcontext][helpstring][propget][id] */ HRESULT STDMETHODCALLTYPE get_LocationName( 
        /* [retval][out] */ __RPC__deref_out_opt BSTR *LocationName) {return notimpl();}
        
    virtual /* [helpcontext][helpstring][propget][id] */ HRESULT STDMETHODCALLTYPE get_LocationURL( 
        /* [retval][out] */ __RPC__deref_out_opt BSTR *LocationURL);
        
    virtual /* [helpcontext][helpstring][propget][id] */ HRESULT STDMETHODCALLTYPE get_Busy( 
        /* [retval][out] */ __RPC__out VARIANT_BOOL *pBool) {return notimpl();}

	virtual HRESULT STDMETHODCALLTYPE GetTypeInfoCount( 
    /* [out] */ __RPC__out UINT *pctinfo) {return notimpl();}
        
    virtual HRESULT STDMETHODCALLTYPE GetTypeInfo( 
        /* [in] */ UINT iTInfo,
        /* [in] */ LCID lcid,
        /* [out] */ __RPC__deref_out_opt ITypeInfo **ppTInfo) {return notimpl();}
        
    virtual HRESULT STDMETHODCALLTYPE GetIDsOfNames( 
        /* [in] */ __RPC__in REFIID riid,
        /* [size_is][in] */ __RPC__in_ecount_full(cNames) LPOLESTR *rgszNames,
        /* [range][in] */ __RPC__in_range(0,16384) UINT cNames,
        /* [in] */ LCID lcid,
        /* [size_is][out] */ __RPC__out_ecount_full(cNames) DISPID *rgDispId) {return notimpl();}
        
    virtual /* [local] */ HRESULT STDMETHODCALLTYPE Invoke( 
        /* [in] */ DISPID dispIdMember,
        /* [in] */ REFIID riid,
        /* [in] */ LCID lcid,
        /* [in] */ WORD wFlags,
        /* [out][in] */ DISPPARAMS *pDispParams,
        /* [out] */ VARIANT *pVarResult,
        /* [out] */ EXCEPINFO *pExcepInfo,
        /* [out] */ UINT *puArgErr) {return notimpl();}
BEGIN_COM_MAP(HTMLDocumentContainer)
    COM_INTERFACE_ENTRY(IOleContainer)
	COM_INTERFACE_ENTRY(IServiceProvider)
	COM_INTERFACE_ENTRY(IWebBrowser2)
	COM_INTERFACE_ENTRY_IID(IID_IWebBrowserApp, IWebBrowser2)
	COM_INTERFACE_ENTRY_IID(IID_IWebBrowser, IWebBrowser2)
	COM_INTERFACE_ENTRY_AGGREGATE_BLIND(dispatcher)
END_COM_MAP()

static const GUID IID_TopLevelBrowser;
BEGIN_SERVICE_MAP(HTMLDocumentContainer)
	SERVICE_ENTRY(IID_IWebBrowserApp)
	SERVICE_ENTRY(IID_IWebBrowser2)
	SERVICE_ENTRY(IID_IWebBrowser)
	SERVICE_ENTRY(SID_SContainerDispatch);
	SERVICE_ENTRY(IID_TopLevelBrowser)
END_SERVICE_MAP()
private:
	FakeDispatcher *dispatcher;
	NPObjectProxy document_;
	NPP npp;
};

