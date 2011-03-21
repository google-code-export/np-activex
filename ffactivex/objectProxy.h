#pragma once

#include <npruntime.h>
#include <npapi.h>
class NPVariantProxy : public NPVariant
{
public:
	NPVariantProxy() {
		VOID_TO_NPVARIANT(*this);
	}
	~NPVariantProxy() {
		NPNFuncs.releasevariantvalue(this);
	}
};


class NPObjectProxy {
private:
	NPObject *object;
public:
	NPObjectProxy() {
		object = NULL;
	}
	NPObjectProxy(NPObject *obj) {
		object = obj;
	}
	void reset() {
		if (object)
			NPNFuncs.releaseobject(object);
		object = NULL;
	}
	~NPObjectProxy() {
		reset();
	}
	operator NPObject*&() {
		return object;
	}
	NPObjectProxy& operator =(NPObject* obj) {
		reset();
		object = obj;
		return *this;
	}
};