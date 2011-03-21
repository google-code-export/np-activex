#pragma once
#include <npapi.h>
#include <npruntime.h>
struct ScriptBase;
class CHost
{
public:
	void AddRef();
	void Release();
	CHost(NPP npp);
	virtual ~CHost(void);
	NPObject *GetScriptableObject();
	
	NPP GetInstance() {
		return instance;
	}
	static ScriptBase *GetInternalObject(NPP npp, NPObject *embed_element);
	
	NPObject *RegisterObject();
	void UnRegisterObject();
	virtual NPP ResetNPP(NPP newNpp);
protected:
	NPP instance;
	ScriptBase *lastObj;
	ScriptBase *GetMyScriptObject();
	virtual ScriptBase *CreateScriptableObject() = 0;
private:
	int ref_cnt_;
};

struct ScriptBase: NPObject {
	NPP instance;
	CHost* host;
	ScriptBase(NPP instance_) : instance(instance_) {
	}
};