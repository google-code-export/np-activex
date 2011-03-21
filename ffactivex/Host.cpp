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