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

	static void	_Deallocate(NPObject *obj)
	{
		delete obj;
	}
	
};

