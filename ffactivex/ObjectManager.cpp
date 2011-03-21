#include "ObjectManager.h"
#include "npactivex.h"
#include "host.h"
#include "axhost.h"
#include "objectProxy.h"
#include "scriptable.h"

#define MANAGER_OBJECT_ID "__activex_manager_IIID_"

NPClass ObjectManager::npClass = {
	/* version */		NP_CLASS_STRUCT_VERSION,
	/* allocate */		ObjectManager::_Allocate,
	/* deallocate */	ObjectManager::_Deallocate,
	/* invalidate */	NULL,
	/* hasMethod */		ObjectManager::HasMethod,
	/* invoke */		ObjectManager::Invoke,
	/* invokeDefault */	NULL,
	/* hasProperty */	ObjectManager::HasProperty,
	/* getProperty */	ObjectManager::GetProperty,
	/* setProperty */	ObjectManager::SetProperty,
	/* removeProperty */ NULL,
	/* enumerate */		NULL,
	/* construct */		NULL
};

ObjectManager::ObjectManager(NPP npp_) : CHost(npp_) {
}

ObjectManager::~ObjectManager(void)
{
	for (uint i = 0; i < hosts.size(); ++i) {
		hosts[i]->Release();
	}
	for (uint i = 0; i < dynamic_hosts.size(); ++i) {
		dynamic_hosts[i]->Release();
	}
}

ObjectManager* ObjectManager::GetManager(NPP npp) {
	NPObjectProxy window;
	NPNFuncs.getvalue(npp, NPNVWindowNPObject, &window);
	NPVariantProxy document, obj;
	NPVariant par;
	STRINGZ_TO_NPVARIANT(MANAGER_OBJECT_ID, par);
	if (!NPNFuncs.getproperty(npp, window, NPNFuncs.getstringidentifier("document"), &document))
		return NULL;
	if (!NPNFuncs.invoke(npp, document.value.objectValue, NPNFuncs.getstringidentifier("getElementById"), &par, 1, &obj))
		return NULL;
	if (NPVARIANT_IS_OBJECT(obj)) {
		NPObject *manager = NPVARIANT_TO_OBJECT(obj);
		ScriptBase *script = GetInternalObject(npp, manager);
		if (script)
			return dynamic_cast<ObjectManager*>(script->host);
	}
	return NULL;
}

CHost* ObjectManager::GetPreviousObject(NPP npp) {
	NPObjectProxy embed;
	NPNFuncs.getvalue(npp, NPNVPluginElementNPObject, &embed);
	return GetMyScriptObject()->host;
}

bool ObjectManager::HasMethod(NPObject *npobj, NPIdentifier name) {
	return name == NPNFuncs.getstringidentifier("CreateControlByProgId");
}

bool ObjectManager::Invoke(NPObject *npobj, NPIdentifier name, const NPVariant *args, uint32_t argCount, NPVariant *result) {
	ScriptManager *obj = static_cast<ScriptManager*>(npobj);
	if (name == NPNFuncs.getstringidentifier("CreateControlByProgId")) {
		if (argCount != 1 || !NPVARIANT_IS_STRING(args[0])) {
			NPNFuncs.setexception(npobj, "Invalid arguments");
			return false;
		}
		CAxHost* host = new CAxHost(obj->instance);
		host->setClsIDFromProgID(NPVARIANT_TO_STRING(args[0]).UTF8Characters);
		if (!host->CreateControl(false)) {
			NPNFuncs.setexception(npobj, "Error creating object");
			return false;
		}
		ObjectManager *manager = static_cast<ObjectManager*>(obj->host);
		manager->dynamic_hosts.push_back(host);
		OBJECT_TO_NPVARIANT(host->CreateScriptableObject(), *result);
		return true;
	}
	return false;
}

bool ObjectManager::HasProperty(NPObject *npObj, NPIdentifier name) {
	if (name == NPNFuncs.getstringidentifier("internalId"))
		return true;
	if (name == NPNFuncs.getstringidentifier("isValid"))
		return true;
	return false;
}

bool ObjectManager::GetProperty(NPObject *npObj, NPIdentifier name, NPVariant *value) {
	if (name == NPNFuncs.getstringidentifier("internalId")) {
		int len = strlen(MANAGER_OBJECT_ID);
		char *stra = (char*)NPNFuncs.memalloc(len + 1);
		strcpy(stra, MANAGER_OBJECT_ID);
		STRINGN_TO_NPVARIANT(stra, len, *value);
		return true;
	}
	if (name == NPNFuncs.getstringidentifier("isValid")) {
		BOOLEAN_TO_NPVARIANT(TRUE, *value);
		return true;
	}
	return false;
}

bool ObjectManager::SetProperty(NPObject *npObj, NPIdentifier name, const NPVariant *value) {
	return false;
}

bool ObjectManager::RequestObjectOwnership(NPP newNpp, CAxHost* host) {
	// reference count of host not changed.
	for (uint i = 0; i < hosts.size(); ++i) {
		if (hosts[i] == host) {
			hosts[i] = hosts.back();
			hosts.pop_back();
			host->ResetNPP(newNpp);
			newNpp->pdata = host;
			return true;
		}
	}
	return false;
}

void ObjectManager::RetainOwnership(CAxHost* host) {
	hosts.push_back(host);
	host->ResetNPP(instance);
}

ScriptBase* ObjectManager::CreateScriptableObject() {
	ScriptBase* obj = static_cast<ScriptBase*>(NPNFuncs.createobject(instance, &npClass));
	return obj;
}