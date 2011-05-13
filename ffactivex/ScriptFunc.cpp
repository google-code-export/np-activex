#include "ScriptFunc.h"

NPClass ScriptFunc::npClass = {
	/* version */		NP_CLASS_STRUCT_VERSION,
	/* allocate */		ScriptFunc::_Allocate,
	/* deallocate */	ScriptFunc::_Deallocate,
	/* invalidate */	NULL,
	/* hasMethod */		NULL, //Scriptable::_HasMethod,
	/* invoke */		NULL, //Scriptable::_Invoke,
	/* invokeDefault */	ScriptFunc::_InvokeDefault,
	/* hasProperty */	NULL,
	/* getProperty */	NULL,
	/* setProperty */	NULL,
	/* removeProperty */ NULL,
	/* enumerate */		NULL,
	/* construct */		NULL
};

 map<pair<Scriptable*, MEMBERID>, ScriptFunc*> ScriptFunc::M;
ScriptFunc::ScriptFunc(NPP inst)
{
}


ScriptFunc::~ScriptFunc(void)
{
	if (script) {
		pair<Scriptable*, MEMBERID> index(script, dispid);
		NPNFuncs.releaseobject(script);
		M.erase(index);
	}
}

ScriptFunc* ScriptFunc::GetObject(NPP npp, Scriptable *script, MEMBERID dispid) {
	pair<Scriptable*, MEMBERID> index(script, dispid);
	if (M[index] == NULL) {
		ScriptFunc *new_obj = (ScriptFunc*)NPNFuncs.createobject(npp, &npClass);
		new_obj->setControl(script, dispid);
		M[index] = new_obj;
	}
	return M[index];
}

bool ScriptFunc::InvokeDefault(const NPVariant *args, uint32_t argCount, NPVariant *result) {
	if (!script)
		return false;
	return script->InvokeID(dispid, args, argCount, result);
}