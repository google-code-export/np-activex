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
#include "Host.h"
#include <atlsafe.h>
#include "objectProxy.h"

class NPSafeArray: public ScriptBase
{
public:
	NPSafeArray(NPP npp);
	~NPSafeArray(void);

	static NPSafeArray* CreateFromArray(NPP instance, SAFEARRAY* array);
	static void RegisterVBArray(NPP npp);
private:
	static NPInvokeDefaultFunctionPtr GetFuncPtr(NPIdentifier name);
	static NPClass npClass;
	CComSafeArray<VARIANT> arr_;
	NPObjectProxy window;
	// Some wrappers to adapt NPAPI's interface.
	static NPObject* Allocate(NPP npp, NPClass *aClass);

	static void	Deallocate(NPObject *obj);
	
	static void	Invalidate(NPObject *obj);

	static bool HasMethod(NPObject *npobj, NPIdentifier name);

	static bool Invoke(NPObject *npobj, NPIdentifier name,
						const NPVariant *args, uint32_t argCount,
						NPVariant *result);
	
	static bool InvokeDefault(NPObject *npobj, const NPVariant *args, uint32_t argCount,
							NPVariant *result);
	
	static bool GetItem(NPObject *npobj, const NPVariant *args, uint32_t argCount,
							NPVariant *result);

	static bool ToArray(NPObject *npobj, const NPVariant *args, uint32_t argCount,
							NPVariant *result);

	static bool UBound(NPObject *npobj, const NPVariant *args, uint32_t argCount,
							NPVariant *result);

	static bool LBound(NPObject *npobj, const NPVariant *args, uint32_t argCount,
							NPVariant *result);

	static bool Dimensions(NPObject *npobj, const NPVariant *args, uint32_t argCount,
							NPVariant *result);

	static bool HasProperty(NPObject *npobj, NPIdentifier name);

	static bool GetProperty(NPObject *npobj, NPIdentifier name, NPVariant *result);

	static bool SetProperty(NPObject *npobj, NPIdentifier name, const NPVariant *value);
};

