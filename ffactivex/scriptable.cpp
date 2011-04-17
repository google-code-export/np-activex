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
#include "scriptable.h"
#include "axhost.h"
#include "npactivex.h"

NPClass Scriptable::npClass = {
	/* version */		NP_CLASS_STRUCT_VERSION,
	/* allocate */		Scriptable::_Allocate,
	/* deallocate */	Scriptable::_Deallocate,
	/* invalidate */	Scriptable::_Invalidate,
	/* hasMethod */		Scriptable::_HasMethod,
	/* invoke */		Scriptable::_Invoke,
	/* invokeDefault */	NULL,
	/* hasProperty */	Scriptable::_HasProperty,
	/* getProperty */	Scriptable::_GetProperty,
	/* setProperty */	Scriptable::_SetProperty,
	/* removeProperty */ NULL,
	/* enumerate */		Scriptable::_Enumerate,
	/* construct */		NULL
};

bool Scriptable::find_member(ITypeInfoPtr info, TYPEATTR *attr, DISPID member_id, unsigned int invKind) {
	bool found = false;
	unsigned int i = 0;

	FUNCDESC *fDesc;

	for (i = 0; (i < attr->cFuncs) && !found; ++i) {

		HRESULT hr = info->GetFuncDesc(i, &fDesc);
		if (SUCCEEDED(hr) 
			&& fDesc 
			&& (fDesc->memid == member_id)) {

			if (invKind & fDesc->invkind)
				found = true;
		}
		info->ReleaseFuncDesc(fDesc);
	}
#if 0
	if (!found && (invKind & ~INVOKE_FUNC)) {

		VARDESC *vDesc;

		for (i = 0; 
				(i < attr->cVars) 
				&& !found; 
				++i) {

			HRESULT hr = info->GetVarDesc(i, &vDesc);
			if (   SUCCEEDED(hr) 
				&& vDesc 
				&& (vDesc->memid == member_id)) {

				found = true;
			}
			info->ReleaseVarDesc(vDesc);
		}
	}

	if (!found) {
		// iterate inherited interfaces
		HREFTYPE refType = NULL;

		for (i = 0; (i < attr->cImplTypes) && !found; ++i) {

			ITypeInfoPtr baseInfo;
			TYPEATTR *baseAttr;

			if (FAILED(info->GetRefTypeOfImplType(0, &refType))) {

				continue;
			}

			if (FAILED(info->GetRefTypeInfo(refType, &baseInfo))) {

				continue;
			}

			baseInfo->AddRef();
			if (FAILED(baseInfo->GetTypeAttr(&baseAttr))) {

				continue;
			}

			found = find_member(baseInfo, baseAttr, member_id, invKind);
			baseInfo->ReleaseTypeAttr(baseAttr);
		}
	}
#endif
	return found;
}

DISPID Scriptable::ResolveName(NPIdentifier name, unsigned int invKind) {
	bool found = false;
	DISPID dID = -1;
	USES_CONVERSION;

	if (!name || !invKind) {

		return -1;
	}

	if (!disp) {

		return -1;
	}

	if (!NPNFuncs.identifierisstring(name)) {

		return -1;
	}

	NPUTF8 *npname = NPNFuncs.utf8fromidentifier(name);

	LPOLESTR oleName = A2W(npname);

	disp->GetIDsOfNames(IID_NULL, &oleName, 1, 0, &dID);

	if ((dID != -1) && (invKind & INVOKE_PROPERTYGET)) {
		// Try to get property to check.
		// Put will failed, and we assume GET won't have any side effect.
		DISPPARAMS par = {0, 0, NULL, NULL};
		CComVariant result;
		HRESULT hr = disp->Invoke(dID, IID_NULL, 1, invKind, &par, &result, NULL, NULL);
		if (hr == DISP_E_MEMBERNOTFOUND || hr == DISP_E_TYPEMISMATCH)
			return -1;
	}
	return dID;
#if 0
	if (dID != -1) {

		ITypeInfoPtr info;
		disp->GetTypeInfo(0, LOCALE_SYSTEM_DEFAULT, &info);
		if (!info) {

			return -1;
		}

		TYPEATTR *attr;
		if (FAILED(info->GetTypeAttr(&attr))) {

			return -1;
		}

		found = find_member(info, attr, dID, invKind);
		info->ReleaseTypeAttr(attr);
	}
	return found ? dID : -1;
#endif
}

bool Scriptable::InvokeControl(DISPID id, WORD wFlags, DISPPARAMS *pDispParams, VARIANT *pVarResult) {
	if (!disp) {

		return false;
	}
	HRESULT hr = disp->Invoke(id, IID_NULL, 0, wFlags, pDispParams, pVarResult, NULL, NULL);

	return (SUCCEEDED(hr)) ? true : false;
}

bool Scriptable::Invoke(NPIdentifier name, const NPVariant *args, uint32_t argCount, NPVariant *result) {
	if (invalid) return false;

	DISPID id = ResolveName(name, INVOKE_FUNC);
	if (-1 == id) {

		return false;
	}

	CComVariant *vArgs = NULL;
	if (argCount) {

		vArgs = new CComVariant[argCount];
		if (!vArgs) {

			return false;
		}

		for (unsigned int i = 0; i < argCount; ++i) {

			// copy the arguments in reverse order
			NPVar2Variant(&args[i], &vArgs[argCount - i - 1], instance);
		}
	}

	DISPPARAMS params = {NULL, NULL, 0, 0};

	params.cArgs = argCount;
	params.cNamedArgs = 0;
	params.rgdispidNamedArgs = NULL;
	params.rgvarg = vArgs;

	CComVariant vResult;

	bool rc = InvokeControl(id, DISPATCH_METHOD, &params, &vResult);
	if (vArgs) {
		delete []vArgs;
	}

	if (!rc) {

		return false;
	}

	Variant2NPVar(&vResult, result, instance);
	return true;
}

bool Scriptable::HasMethod(NPIdentifier name)  {
	if (invalid) return false;
	DISPID id = ResolveName(name, INVOKE_FUNC);
	return (id != -1) ? true : false;
}

bool Scriptable::HasProperty(NPIdentifier name) {
	if (invalid) return false;

	DISPID id = ResolveName(name, INVOKE_PROPERTYGET | INVOKE_PROPERTYPUT);
	return (id != -1) ? true : false;
}

bool Scriptable::GetProperty(NPIdentifier name, NPVariant *result) {

	if (invalid) return false;

	DISPID id = ResolveName(name, INVOKE_PROPERTYGET);
	if (-1 == id) {

		return false;
	}

	DISPPARAMS params;

	params.cArgs = 0;
	params.cNamedArgs = 0;
	params.rgdispidNamedArgs = NULL;
	params.rgvarg = NULL;

	CComVariant vResult;

	if (!InvokeControl(id, DISPATCH_PROPERTYGET, &params, &vResult)) {

		return false;
	}

	Variant2NPVar(&vResult, result, instance);
	return true;
}

bool Scriptable::SetProperty(NPIdentifier name, const NPVariant *value) {
	if (invalid) return false;

	DISPID id = ResolveName(name, INVOKE_PROPERTYPUT);
	if (-1 == id) {

		return false;
	}

	CComVariant val;
	NPVar2Variant(value, &val, instance);

	DISPPARAMS params;
	// Special initialization needed when using propery put.
	DISPID dispidNamed = DISPID_PROPERTYPUT;
	params.cNamedArgs = 1;
	params.rgdispidNamedArgs = &dispidNamed;
	params.cArgs = 1;
	params.rgvarg = &val;

	CComVariant vResult;
	if (!InvokeControl(id, DISPATCH_PROPERTYPUT, &params, &vResult)) {

		return false;
	}

	return true;
}
Scriptable* Scriptable::FromAxHost(NPP npp, CAxHost* host)
{
	Scriptable *new_obj = (Scriptable*)NPNFuncs.createobject(npp, &npClass);
	IUnknown *unk;
	host->GetControlUnknown(&unk);
	new_obj->setControl(unk);
	new_obj->host = host;
	unk->Release();
	return new_obj;
}


NPObject* Scriptable::_Allocate(NPP npp, NPClass *aClass)
{
	np_log(npp, 3, "Allocate obj");
	return new Scriptable(npp);
}

void Scriptable::_Deallocate(NPObject *obj) {
	if (obj) {
		Scriptable *a = static_cast<Scriptable*>(obj);
		//np_log(a->instance, 3, "Dealocate obj");
		delete a;
	}
}

bool Scriptable::Enumerate(NPIdentifier **value, uint32_t *count) {
	UINT cnt;
	if (!disp || FAILED(disp->GetTypeInfoCount(&cnt)))
		return false;
	*count = 0;
	for (UINT i = 0; i < cnt; ++i) {
		CComPtr<ITypeInfo> info;
		disp->GetTypeInfo(i, LOCALE_SYSTEM_DEFAULT, &info);
		TYPEATTR *attr;
		info->GetTypeAttr(&attr);
		*count += attr->cFuncs;
		info->ReleaseTypeAttr(attr);
	}
	uint32_t pos = 0;
	NPIdentifier *v = (NPIdentifier*) NPNFuncs.memalloc(sizeof(NPIdentifier) * *count);
	USES_CONVERSION;
	for (UINT i = 0; i < cnt; ++i) {
		CComPtr<ITypeInfo> info;
		disp->GetTypeInfo(i, LOCALE_SYSTEM_DEFAULT, &info);
		TYPEATTR *attr;
		info->GetTypeAttr(&attr);
		BSTR name;
		for (uint j = 0; j < attr->cFuncs; ++j) {
			FUNCDESC *desc;
			info->GetFuncDesc(j, &desc);
			if (SUCCEEDED(info->GetDocumentation(desc->memid, &name, NULL, NULL, NULL))) {
				LPCSTR str = OLE2A(name);
				v[pos++] = NPNFuncs.getstringidentifier(str);
				SysFreeString(name);
			}
			info->ReleaseFuncDesc(desc);
		}
		info->ReleaseTypeAttr(attr);
	}
	*count = pos;
	*value = v;
	return true;
}