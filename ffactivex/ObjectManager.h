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
#include <npapi.h>
#include <npruntime.h>
#include <map>
#include <vector>
#include "Host.h"
class CAxHost;
class ObjectManager : public CHost
{
public:
	ObjectManager(NPP npp2);

	~ObjectManager(void);
	static NPClass npClass;
	CHost* GetPreviousObject(NPP npp);
	static ObjectManager* GetManager(NPP npp);

	virtual ScriptBase *CreateScriptableObject();

	void RetainOwnership(CAxHost *obj);

	bool RequestObjectOwnership(NPP newNpp, CAxHost* obj);

private:

	struct ScriptManager : public ScriptBase {
		ScriptManager(NPP npp) : ScriptBase(npp) {
		}
	};

	std::vector<CHost*> hosts;
	std::vector<CHost*> dynamic_hosts;
	static NPObject* _Allocate(NPP npp, NPClass *aClass) {
		ScriptManager *obj = new ScriptManager(npp);
		return obj;
	}
	
	static bool Invoke(NPObject *obj, NPIdentifier name, const NPVariant *args, uint32_t argCount, NPVariant *result);
	
	static bool HasMethod(NPObject *obj, NPIdentifier name);
	
	static bool HasProperty(NPObject *obj, NPIdentifier name);
	
	static bool GetProperty(NPObject *obj, NPIdentifier name, NPVariant *value);
	
	static bool SetProperty(NPObject *obj, NPIdentifier name, const NPVariant *value);

	static void	Deallocate(NPObject *obj);
	
};

