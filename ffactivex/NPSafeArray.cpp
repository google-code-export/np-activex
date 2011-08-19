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

#include "NPSafeArray.h"
#include "npactivex.h"
#include "objectProxy.h"
#include <OleAuto.h>


NPClass NPSafeArray::npClass = {
	/* version */		NP_CLASS_STRUCT_VERSION,
	/* allocate */		NPSafeArray::Allocate,
	/* deallocate */	NPSafeArray::Deallocate,
	/* invalidate */	NPSafeArray::Invalidate,
	/* hasMethod */		NPSafeArray::HasMethod,
	/* invoke */		NPSafeArray::Invoke,
	/* invokeDefault */	NPSafeArray::InvokeDefault,
	/* hasProperty */	NPSafeArray::HasProperty,
	/* getProperty */	NPSafeArray::GetProperty,
	/* setProperty */	NPSafeArray::SetProperty,
	/* removeProperty */ NULL,
	/* enumerate */		NULL,
	/* construct */		NPSafeArray::InvokeDefault
};

NPSafeArray::NPSafeArray(NPP npp): ScriptBase(npp)
{
	NPNFuncs.getvalue(npp, NPNVWindowNPObject, &window);
}


NPSafeArray::~NPSafeArray(void)
{
}

// Some wrappers to adapt NPAPI's interface.
NPObject* NPSafeArray::Allocate(NPP npp, NPClass *aClass) {
	return new NPSafeArray(npp);
}

void NPSafeArray::Deallocate(NPObject *obj){
	delete static_cast<NPSafeArray*>(obj);
}
	
LPSAFEARRAY NPSafeArray::GetArrayPtr() {
	return arr_.m_psa;
}

NPInvokeDefaultFunctionPtr NPSafeArray::GetFuncPtr(NPIdentifier name) {
	if (name == NPNFuncs.getstringidentifier("getItem")) {
		return NPSafeArray::GetItem;
	} else if (name == NPNFuncs.getstringidentifier("toArray")) {
		return NPSafeArray::ToArray;
	} else if (name == NPNFuncs.getstringidentifier("lbound")) {
		return NPSafeArray::LBound;
	} else if (name == NPNFuncs.getstringidentifier("ubound")) {
		return NPSafeArray::UBound;
	} else if (name == NPNFuncs.getstringidentifier("dimensions")) {
		return NPSafeArray::Dimensions;
	} else {
		return NULL;
	}
}

void NPSafeArray::Invalidate(NPObject *obj) {
	NPSafeArray *safe = static_cast<NPSafeArray*>(obj);
	safe->arr_.Destroy();
}

bool NPSafeArray::HasMethod(NPObject *npobj, NPIdentifier name) {
	return GetFuncPtr(name) != NULL;
}

void NPSafeArray::RegisterVBArray(NPP npp) {
	NPObjectProxy window;
	NPNFuncs.getvalue(npp, NPNVWindowNPObject, &window);
	NPIdentifier vbarray = NPNFuncs.getstringidentifier("VBArray");
	if (!NPNFuncs.hasproperty(npp, window, vbarray)) {
		NPVariantProxy var;
		NPObject *def = NPNFuncs.createobject(npp, &npClass);
		OBJECT_TO_NPVARIANT(def, var);
		NPNFuncs.setproperty(npp, window, vbarray, &var);
	}
}

NPSafeArray *NPSafeArray::CreateFromArray(NPP instance, SAFEARRAY *array) {
	NPSafeArray *ret = (NPSafeArray *)NPNFuncs.createobject(instance, &npClass);
	ret->arr_.Attach(array);
	return ret;
}

bool NPSafeArray::Invoke(NPObject *npobj, NPIdentifier name,
					const NPVariant *args, uint32_t argCount,
					NPVariant *result) {
	NPSafeArray *safe = static_cast<NPSafeArray*>(npobj);
	if (safe->arr_.m_psa == NULL)
		return false;
	NPInvokeDefaultFunctionPtr ptr = GetFuncPtr(name);
	if (ptr) {
		return ptr(npobj, args, argCount, result);
	} else {
		return false;
	}
}

bool NPSafeArray::InvokeDefault(NPObject *npobj, const NPVariant *args, uint32_t argCount,
								NPVariant *result) {
	NPSafeArray *safe = static_cast<NPSafeArray*>(npobj);
	if (safe->arr_.m_psa != NULL)
		return false;
	if (argCount < 1)
		return false;
	if (!NPVARIANT_IS_OBJECT(*args)) {
		return false;
	}
	NPObject *obj = NPVARIANT_TO_OBJECT(*args);
	if (obj->_class != &NPSafeArray::npClass) {
		return false;
	}
	
	NPSafeArray *safe_original = static_cast<NPSafeArray*>(obj);
	if (safe_original->arr_.m_psa == NULL) {
		return false;
	}

	NPSafeArray *ret = CreateFromArray(safe->instance, safe_original->arr_);
	OBJECT_TO_NPVARIANT(ret, *result);
	return true;
}

bool NPSafeArray::GetItem(NPObject *npobj, const NPVariant *args, uint32_t argCount,
						  NPVariant *result) {
	NPSafeArray *safe = static_cast<NPSafeArray*>(npobj);
	if (safe->arr_.m_psa == NULL)
		return false;
	LONG dim = safe->arr_.GetDimensions();
	if (argCount < safe->arr_.GetDimensions()) {
		return false;
	}
	CAutoVectorPtr<LONG>pos(new LONG[dim]);
	for (int i = 0; i < dim; ++i) {
		if (NPVARIANT_IS_DOUBLE(args[i])) {
			pos[i] = (LONG)NPVARIANT_TO_DOUBLE(args[i]);
		} else if (NPVARIANT_IS_INT32(args[i])) {
			pos[i] = NPVARIANT_TO_INT32(args[i]);
		} else {
			return false;
		}
	}
	VARIANT var;
	if (!SUCCEEDED(safe->arr_.MultiDimGetAt(pos, var))) {
		return false;
	}
	Variant2NPVar(&var, result, safe->instance);
	return true;
}

bool NPSafeArray::Dimensions(NPObject *npobj, const NPVariant *args, uint32_t argCount,
								NPVariant *result) {
	NPSafeArray *safe = static_cast<NPSafeArray*>(npobj);
	if (safe->arr_.m_psa == NULL)
		return false;
	INT32_TO_NPVARIANT(safe->arr_.GetDimensions(), *result);
	return true;
}


bool NPSafeArray::UBound(NPObject *npobj, const NPVariant *args, uint32_t argCount,
								NPVariant *result) {
	NPSafeArray *safe = static_cast<NPSafeArray*>(npobj);
	if (safe->arr_.m_psa == NULL)
		return false;
	
	int dim = 1;
	if (argCount >= 1) {
		if (NPVARIANT_IS_INT32(*args)) {
			dim = NPVARIANT_TO_INT32(*args);
		} else if (NPVARIANT_IS_DOUBLE(*args)) {
			dim = (LONG)NPVARIANT_TO_DOUBLE(*args);
		} else  {
			return false;
		}
	}
	try{
		INT32_TO_NPVARIANT(safe->arr_.GetUpperBound(dim - 1), *result);
	} catch (...) {
		return false;
	}
	return true;
}

bool NPSafeArray::LBound(NPObject *npobj, const NPVariant *args, uint32_t argCount,
						 NPVariant *result) {
	NPSafeArray *safe = static_cast<NPSafeArray*>(npobj);
	if (safe->arr_.m_psa == NULL)
		return false;
	
	int dim = 1;
	if (argCount >= 1) {
		if (NPVARIANT_IS_INT32(*args)) {
			dim = NPVARIANT_TO_INT32(*args);
		} else if (NPVARIANT_IS_DOUBLE(*args)) {
			dim = (LONG)NPVARIANT_TO_DOUBLE(*args);
		} else  {
			return false;
		}
	}
	try{
		INT32_TO_NPVARIANT(safe->arr_.GetLowerBound(dim - 1), *result);
	} catch (...) {
		return false;
	}
	return true;
}

bool NPSafeArray::ToArray(NPObject *npobj, const NPVariant *args, uint32_t argCount,
								NPVariant *result) {
	NPSafeArray *safe = static_cast<NPSafeArray*>(npobj);
	if (safe->arr_.m_psa == NULL)
		return false;
	
	long count = 1, dim = safe->arr_.GetDimensions();
	for (int d = 0; d < dim; ++d) {
		count *= safe->arr_.GetCount(d);
	}
	NPString command = {"[]", 2};

	if (!NPNFuncs.evaluate(safe->instance, safe->window, &command, result))
		return false;
	VARIANT* vars = (VARIANT*)safe->arr_.m_psa->pvData;
	NPIdentifier push = NPNFuncs.getstringidentifier("push");
	for (long i = 0; i < count; ++i) {
		NPVariantProxy v;
		NPVariant arg;
		Variant2NPVar(&vars[i], &arg, safe->instance);
		if (!NPNFuncs.invoke(safe->instance, NPVARIANT_TO_OBJECT(*result), push, &arg, 1, &v)) {
			return false;
		}
	}
	return true;
}

bool NPSafeArray::HasProperty(NPObject *npobj, NPIdentifier name) {
	return false;
}

bool NPSafeArray::GetProperty(NPObject *npobj, NPIdentifier name, NPVariant *result) {
	return false;
}

bool NPSafeArray::SetProperty(NPObject *npobj, NPIdentifier name, const NPVariant *value) {
	return false;
}