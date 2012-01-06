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

#include "HTMLDocumentContainer.h"
#include "npactivex.h"
#include <MsHTML.h>
const GUID HTMLDocumentContainer::IID_TopLevelBrowser = {0x4C96BE40, 0x915C, 0x11CF, {0x99, 0xD3, 0x00, 0xAA, 0x00, 0x4A, 0xE8, 0x37}};
HTMLDocumentContainer::HTMLDocumentContainer() : dispatcher(NULL)
{

}

void HTMLDocumentContainer::Init(NPP instance, ITypeLib *htmlLib) {
	NPObjectProxy npWindow;
	NPNFuncs.getvalue(instance, NPNVWindowNPObject, &npWindow);
	NPVariantProxy documentVariant;
	if (NPNFuncs.getproperty(instance, npWindow, NPNFuncs.getstringidentifier("document"), &documentVariant)
		&& NPVARIANT_IS_OBJECT(documentVariant)) {
		NPObject *npDocument = NPVARIANT_TO_OBJECT(documentVariant);
		dispatcher = new FakeDispatcher(instance, htmlLib, npDocument);
	}
	npp = instance;
}

HRESULT HTMLDocumentContainer::get_LocationURL(BSTR *str) {
	NPObjectProxy npWindow;
	NPNFuncs.getvalue(npp, NPNVWindowNPObject, &npWindow);
	NPVariantProxy LocationVariant;
	if (!NPNFuncs.getproperty(npp, npWindow, NPNFuncs.getstringidentifier("location"), &LocationVariant)
		|| !NPVARIANT_IS_OBJECT(LocationVariant)) {
			return E_FAIL;
	}
	NPObject *npLocation = NPVARIANT_TO_OBJECT(LocationVariant);
	NPVariantProxy npStr;
	if (!NPNFuncs.getproperty(npp, npLocation, NPNFuncs.getstringidentifier("href"), &npStr))
		return E_FAIL;
	CComBSTR bstr(npStr.value.stringValue.UTF8Length, npStr.value.stringValue.UTF8Characters);
	*str = bstr.Detach();
	return S_OK;
}


HRESULT STDMETHODCALLTYPE HTMLDocumentContainer::get_Document( 
	__RPC__deref_out_opt IDispatch **ppDisp) {
	if (dispatcher)
		return dispatcher->QueryInterface(DIID_DispHTMLDocument, (LPVOID*)ppDisp);
	return E_FAIL;
}

HTMLDocumentContainer::~HTMLDocumentContainer(void)
{
}
