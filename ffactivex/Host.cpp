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

#include "Host.h"
#include "npactivex.h"
#include "ObjectManager.h"
#include "objectProxy.h"
#include <npapi.h>
#include <npruntime.h>

CHost::CHost(NPP npp)
	: ref_cnt_(1),
	  instance(npp),
	  lastObj(NULL)
{
}

CHost::~CHost(void)
{
	UnRegisterObject();
	np_log(instance, 3, "CHost::~CHost");
}

void CHost::AddRef()
{
	++ref_cnt_;
}

void CHost::Release()
{
	--ref_cnt_;
	if (!ref_cnt_)
		delete this;
}

NPObject *CHost::GetScriptableObject() {
	return lastObj;
}

NPObject *CHost::RegisterObject() {
	lastObj = CreateScriptableObject();
	lastObj->host = this;
	NPObjectProxy embed;
	NPNFuncs.getvalue(instance, NPNVPluginElementNPObject, &embed);
	NPVariant var;
	OBJECT_TO_NPVARIANT(lastObj, var);
	// It doesn't matter which npp in setting.
	NPNFuncs.setproperty(instance, embed, NPNFuncs.getstringidentifier("object"), &var);
	
	np_log(instance, 3, "RegisterObject");
	return lastObj;
}

void CHost::UnRegisterObject() {
	if (lastObj) {
		lastObj->instance = NULL;
		lastObj->host = NULL;
		NPNFuncs.releaseobject(lastObj);
		lastObj = NULL;
	}
	return;
	NPObjectProxy embed;
	NPNFuncs.getvalue(instance, NPNVPluginElementNPObject, &embed);
	NPVariant var;
	VOID_TO_NPVARIANT(var);
	NPNFuncs.removeproperty(instance, embed, NPNFuncs.getstringidentifier("object"));
	
	np_log(instance, 3, "UnRegisterObject");
	lastObj = NULL;
}

NPP CHost::ResetNPP(NPP newNPP) {
	NPP ret = instance;
	UnRegisterObject();
	instance = newNPP;
	np_log(newNPP, 3, "Reset NPP from 0x%08x to 0x%08x", ret, newNPP);
	RegisterObject();
	return ret;
}

ScriptBase *CHost::GetInternalObject(NPP npp, NPObject *embed_element)
{
	NPVariantProxy var;
	if (!NPNFuncs.getproperty(npp, embed_element, NPNFuncs.getstringidentifier("object"), &var))
		return NULL;
	if (NPVARIANT_IS_OBJECT(var)) {
		ScriptBase *obj = static_cast<ScriptBase*>(NPVARIANT_TO_OBJECT(var));
		NPNFuncs.retainobject(obj);
		return obj;		
	}
	return NULL;
}

ScriptBase *CHost::GetMyScriptObject() {
	NPObjectProxy embed;
	NPNFuncs.getvalue(instance, NPNVPluginElementNPObject, &embed);
	return GetInternalObject(instance, embed);
}