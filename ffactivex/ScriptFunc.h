#pragma once
#include <npapi.h>
#include <npruntime.h>
#include <OleAuto.h>
#include "scriptable.h"
#include "npactivex.h"
#include <map>
using std::map;
using std::pair;

class ScriptFunc : public NPObject
{
private:
	static NPClass npClass;
	Scriptable *script;
	MEMBERID dispid;
	void setControl(Scriptable *script, MEMBERID dispid) {
		
		NPNFuncs.retainobject(script);
		this->script = script;
		this->dispid = dispid;
	}
	static map<pair<Scriptable*, MEMBERID>, ScriptFunc*> M;
	bool InvokeDefault(const NPVariant *args, uint32_t argCount, NPVariant *result);
public:
	ScriptFunc(NPP inst);
	~ScriptFunc(void);

	static NPObject *_Allocate(NPP npp, NPClass *npClass) {
		return new ScriptFunc(npp);
	}

	static void _Deallocate(NPObject *object) {
		ScriptFunc *obj = (ScriptFunc*)(object);
		delete obj;
	}
	
	static ScriptFunc* GetObject(NPP npp, Scriptable *script, MEMBERID dispid);

	static bool _InvokeDefault(NPObject *npobj, const NPVariant *args, uint32_t argCount,
						NPVariant *result) {
		return ((ScriptFunc *)npobj)->InvokeDefault(args, argCount, result);
	}
};

