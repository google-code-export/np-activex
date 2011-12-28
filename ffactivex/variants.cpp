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
 * The Original Code is itstructures.com code.
 *
 * The Initial Developer of the Original Code is IT Structures.
 * Portions created by the Initial Developer are Copyright (C) 2008
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor:
 *                Ruediger Jungbeck <ruediger.jungbeck@rsj.de>
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

#include <atlbase.h>
#include <atlsafe.h>
#include <npapi.h>
#include <npfunctions.h>

#include "FakeDispatcher.h"
#include <npruntime.h>
#include "scriptable.h"
#include "GenericNPObject.h"
#include <OleAuto.h>
#include "variants.h"

#include "NPSafeArray.h"

void
BSTR2NPVar(BSTR bstr, NPVariant *npvar, NPP instance)
{
	char *npStr = NULL;
	size_t sourceLen;
	size_t bytesNeeded;

	sourceLen = lstrlenW(bstr);

	bytesNeeded = WideCharToMultiByte(CP_UTF8,
									0,
									bstr,
									sourceLen,
									NULL,
									0,
									NULL,
									NULL);

	bytesNeeded += 1;

	// complete lack of documentation on Mozilla's part here, I have no
	// idea how this string is supposed to be freed
	npStr = (char *)NPNFuncs.memalloc(bytesNeeded);
	if (npStr) {
		int len = WideCharToMultiByte(CP_UTF8,
							0,
							bstr,
							sourceLen,
							npStr,
							bytesNeeded - 1,
							NULL,
							NULL);
		npStr[len] = 0;

		STRINGN_TO_NPVARIANT(npStr, len, (*npvar));
	}
	else {

		VOID_TO_NPVARIANT(*npvar);
	}
}

BSTR NPStringToBstr(const NPString npstr) {
	size_t bytesNeeded;

	bytesNeeded = MultiByteToWideChar(
		CP_UTF8, 0, npstr.UTF8Characters, npstr.UTF8Length, NULL, 0);

	bytesNeeded += 1;

	BSTR bstr = (BSTR)CoTaskMemAlloc(sizeof(OLECHAR) * bytesNeeded);
	if (bstr) {

		int len = MultiByteToWideChar(
			CP_UTF8, 0, npstr.UTF8Characters, npstr.UTF8Length, bstr, bytesNeeded);
		bstr[len] = 0;
		return bstr;
	}
	return NULL;
}

void
Unknown2NPVar(IUnknown *unk, NPVariant *npvar, NPP instance)
{
	FakeDispatcher *disp = NULL;
	if (SUCCEEDED(unk->QueryInterface(IID_IFakeDispatcher, (void**)&disp))) {
		OBJECT_TO_NPVARIANT(disp->getObject(), *npvar);
		NPNFuncs.retainobject(disp->getObject());
		disp->Release();
	} else {
		NPObject *obj = Scriptable::FromIUnknown(instance, unk);
		OBJECT_TO_NPVARIANT(obj, (*npvar));
	}
}

#define GETVALUE(var, val)	(((var->vt) & VT_BYREF) ? *(var->p##val) : (var->val))

void
Variant2NPVar(const VARIANT *var, NPVariant *npvar, NPP instance)
{
	NPObject *obj = NULL;

	if (!var || !npvar) {

		return;
	}
	VOID_TO_NPVARIANT(*npvar);
	USES_CONVERSION;
	switch (var->vt & ~VT_BYREF) {
	case VT_ARRAY | VT_VARIANT:
		NPSafeArray::RegisterVBArray(instance);
		NPSafeArray *obj;
		obj = NPSafeArray::CreateFromArray(instance, var->parray);
		OBJECT_TO_NPVARIANT(obj, (*npvar));
		break;

	case VT_EMPTY:
		VOID_TO_NPVARIANT((*npvar));
		break;

	case VT_NULL:
		NULL_TO_NPVARIANT((*npvar));
		break;

	case VT_LPSTR:
		// not sure it can even appear in a VARIANT, but...
		STRINGZ_TO_NPVARIANT(var->pcVal, (*npvar));
		break;

	case VT_BSTR:
		BSTR2NPVar(GETVALUE(var, bstrVal), npvar, instance);
		break;

	case VT_I1:
		INT32_TO_NPVARIANT((INT32)GETVALUE(var, cVal), (*npvar));
		break;

	case VT_I2:
		INT32_TO_NPVARIANT((INT32)GETVALUE(var, iVal), (*npvar));
		break;

	case VT_I4:
		INT32_TO_NPVARIANT((INT32)GETVALUE(var, lVal), (*npvar));
		break;

	case VT_UI1:
		INT32_TO_NPVARIANT((INT32)GETVALUE(var, bVal), (*npvar));
		break;

	case VT_UI2:
		INT32_TO_NPVARIANT((INT32)GETVALUE(var, uiVal), (*npvar));
		break;

	case VT_UI4:
		INT32_TO_NPVARIANT((INT32)GETVALUE(var, ulVal), (*npvar));
		break;

	case VT_BOOL:
		BOOLEAN_TO_NPVARIANT((GETVALUE(var, boolVal) == VARIANT_TRUE) ? true : false, (*npvar));
		break;

	case VT_R4:
		DOUBLE_TO_NPVARIANT((double)GETVALUE(var, fltVal), (*npvar));
		break;

	case VT_R8:
		DOUBLE_TO_NPVARIANT(GETVALUE(var, dblVal), (*npvar));
		break;

	case VT_DISPATCH:
	case VT_USERDEFINED:
	case VT_UNKNOWN:
		Unknown2NPVar(GETVALUE(var, punkVal), npvar, instance);
		break;

	case VT_VARIANT:
		Variant2NPVar(var->pvarVal, npvar, instance);
		break;
	default:
		// Some unsupported type
		__asm int 3;
		break;
	}
}
#undef GETVALUE

ITypeLib *pHtmlLib;
void
NPVar2Variant(const NPVariant *npvar, VARIANT *var, NPP instance)
{

	if (!var || !npvar) {

		return;
	}
	var->vt = VT_EMPTY;
	switch (npvar->type) {
	case NPVariantType_Void:
		var->vt = VT_EMPTY;
		var->ulVal = 0;
		break;

	case NPVariantType_Null:
		var->vt = VT_NULL;
		var->byref = NULL;
		break;

	case NPVariantType_Bool:
		var->vt = VT_BOOL;
		var->ulVal = npvar->value.boolValue;
		break;

	case NPVariantType_Int32:
		var->vt = VT_I4;
		var->ulVal = npvar->value.intValue;
		break;

	case NPVariantType_Double:
		var->vt = VT_R8;
		var->dblVal = npvar->value.doubleValue;
		break;

	case NPVariantType_String:
		(CComVariant&)*var = NPStringToBstr(npvar->value.stringValue);
		break;

	case NPVariantType_Object:
		NPObject *object = NPVARIANT_TO_OBJECT(*npvar);
		var->vt = VT_DISPATCH;
		if (object->_class == &Scriptable::npClass) {
			Scriptable* scriptObj = (Scriptable*)object;
			scriptObj->getControl(&var->punkVal);
		} if (object->_class == &NPSafeArray::npClass) {
			NPSafeArray* arrayObj = (NPSafeArray*)object;
			var->vt = VT_ARRAY | VT_VARIANT;
			var->parray = arrayObj->GetArrayPtr();
		}else {
			IUnknown *val = new FakeDispatcher(instance, pHtmlLib, object);
			var->punkVal = val;
		}
		break;
	}
}

size_t VariantSize(VARTYPE vt) {
	if ((vt & VT_BYREF) || (vt & VT_ARRAY))
		return sizeof(LPVOID);
	switch (vt)
	{
	case VT_EMPTY:
	case VT_NULL:
	case VT_VOID:
		return 0;
	case VT_I1:
	case VT_UI1:
		return 1;
	case VT_I2:
	case VT_UI2:
		return 2;
	case VT_R8:
	case VT_DATE:
	case VT_I8:
	case VT_UI8:
	case VT_CY:
		return 8;
	case VT_I4:
	case VT_R4:
	case VT_UI4:
	case VT_BOOL:
		return 4;
	case VT_BSTR:
	case VT_DISPATCH:
	case VT_ERROR:
	case VT_UNKNOWN:
	case VT_DECIMAL:
	case VT_INT:
	case VT_UINT:
	case VT_HRESULT:
	case VT_PTR:
	case VT_SAFEARRAY:
	case VT_CARRAY:
	case VT_USERDEFINED:
	case VT_LPSTR:
	case VT_LPWSTR:
	case VT_INT_PTR:
	case VT_UINT_PTR:
		return sizeof(LPVOID);
	case VT_VARIANT:
		return sizeof(VARIANT);
	default:
		return 0;
	}
}


HRESULT ConvertVariantToGivenType(ITypeInfo *baseType, const TYPEDESC &vt, const VARIANT &var, LPVOID dest) {
	// var is converted from NPVariant, so only limited types are possible.
	HRESULT hr = S_OK;
	switch (vt.vt)
	{
	case VT_EMPTY:
	case VT_VOID:
	case VT_NULL:
		return S_OK;
	case VT_I1:
	case VT_UI1:
	case VT_I2:
	case VT_UI2:
	case VT_I4:
	case VT_R4:
	case VT_UI4:
	case VT_BOOL:
	case VT_INT:
	case VT_UINT:
		int intvalue;
		intvalue = NULL;
		if (var.vt == VT_R8)
			intvalue = (int)var.dblVal;
		else if (var.vt == VT_BOOL)
			intvalue = (int)var.boolVal;
		else if (var.vt == VT_UI4)
			intvalue = var.intVal;
		**(int**)dest = intvalue;
		break;
	case VT_R8:
		double dblvalue;
		dblvalue = 0.0;
		if (var.vt == VT_R8)
			dblvalue = (double)var.dblVal;
		else if (var.vt == VT_BOOL)
			dblvalue = (double)var.boolVal;
		else if (var.vt == VT_UI4)
			dblvalue = var.intVal;
		**(double**)dest = dblvalue;
		break;
	case VT_DATE:
	case VT_I8:
	case VT_UI8:
	case VT_CY:
		// I don't know how to deal with these types..
		__asm{int 3};
	case VT_BSTR:
	case VT_DISPATCH:
	case VT_ERROR:
	case VT_UNKNOWN:
	case VT_DECIMAL:
	case VT_HRESULT:
	case VT_SAFEARRAY:
	case VT_CARRAY:
	case VT_LPSTR:
	case VT_LPWSTR:
	case VT_INT_PTR:
	case VT_UINT_PTR:
		**(ULONG***)dest = var.pulVal;
		break;
	case VT_USERDEFINED:
		{
			if (var.vt != VT_UNKNOWN) {
				return E_FAIL;
			} else {
				ITypeInfo *newType;
				baseType->GetRefTypeInfo(vt.hreftype, &newType);
				IUnknown *unk = var.punkVal;
				TYPEATTR *attr;
				newType->GetTypeAttr(&attr);
				hr = unk->QueryInterface(attr->guid, (LPVOID*)dest);
				unk->Release();
				newType->ReleaseTypeAttr(attr);
				newType->Release();
			}
		}
		break;
	case VT_PTR:
		ConvertVariantToGivenType(baseType, *vt.lptdesc, var, *(LPVOID*)dest);
		break;
	case VT_VARIANT:
		memcpy(*(VARIANT**)dest, &var, sizeof(var));
	default:
		_asm{int 3}
	}
	return hr;
}

void RawTypeToVariant(const TYPEDESC &desc, LPVOID source, VARIANT* var) {
	BOOL pointer = FALSE;
	switch (desc.vt) {
	case VT_BSTR:
	case VT_DISPATCH:
	case VT_ERROR:
	case VT_UNKNOWN:
	case VT_SAFEARRAY:
	case VT_CARRAY:
	case VT_LPSTR:
	case VT_LPWSTR:
	case VT_INT_PTR:
	case VT_UINT_PTR:
	case VT_PTR:
		// These are pointers
		pointer = TRUE;
		break;
	default:
		if (var->vt & VT_BYREF) 
			pointer = TRUE;
	}
	if (pointer) {
		var->vt = desc.vt;
		var->pulVal = *(PULONG*)source;
	} else if (desc.vt == VT_VARIANT) {
		// It passed by object, but we use as a pointer
		var->vt = desc.vt;
		var->pulVal = (PULONG)source;
	} else {
		var->vt = desc.vt | VT_BYREF;
		var->pulVal = (PULONG)source;
	}
}