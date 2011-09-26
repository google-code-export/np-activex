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

#pragma once

#include <atlbase.h>
#include <comdef.h>
#include <npapi.h>
#include <npfunctions.h>
#include <npruntime.h>
#include "variants.h"
#include "FakeDispatcher.h"
#include "Host.h"
extern NPNetscapeFuncs NPNFuncs;
class CAxHost;

struct Scriptable: public ScriptBase
{
private:
	Scriptable(const Scriptable &);

	// This method iterates all members of the current interface, looking for the member with the 
	// id of member_id. If not found within this interface, it will iterate all base interfaces
	// recursively, until a match is found, or all the hierarchy was searched.
	bool find_member(ITypeInfoPtr info, TYPEATTR *attr, DISPID member_id, unsigned int invKind);

	DISPID ResolveName(NPIdentifier name, unsigned int invKind);

	//bool InvokeControl(DISPID id, WORD wFlags, DISPPARAMS *pDispParams, VARIANT *pVarResult);

	CComQIPtr<IDispatch> disp;
	bool invalid;
	DISPID dispid;
	void setControl(IUnknown *unk) {
		disp = unk;
	}

	bool IsProperty(DISPID member_id);

public:
	Scriptable(NPP npp):
	    ScriptBase(npp),
		invalid(false) {
		dispid = -1;
	}

	~Scriptable() {
	}

	static NPClass npClass;
	
	static Scriptable* FromIUnknown(NPP npp, IUnknown *unk) {
		Scriptable *new_obj = (Scriptable*)NPNFuncs.createobject(npp, &npClass);
		new_obj->setControl(unk);
		return new_obj;
	}

	static Scriptable* FromAxHost(NPP npp, CAxHost* host);

	HRESULT getControl(IUnknown **obj) { 
		if (disp) { 
			*obj = disp.p;
			(*obj)->AddRef();
			return S_OK;
		}
		return E_NOT_SET;
	}

	void Invalidate() {invalid = true;}

	bool HasMethod(NPIdentifier name);

	bool Invoke(NPIdentifier name, const NPVariant *args, uint32_t argCount, NPVariant *result);
	
	bool InvokeID(DISPID id, const NPVariant *args, uint32_t argCount, NPVariant *result);

	bool HasProperty(NPIdentifier name);

	bool GetProperty(NPIdentifier name, NPVariant *result);
	
	bool SetProperty(NPIdentifier name, const NPVariant *value);

	bool Enumerate(NPIdentifier **value, uint32_t *count);

private:
	
	// Some wrappers to adapt NPAPI's interface.
	static NPObject* _Allocate(NPP npp, NPClass *aClass);

	static void	_Deallocate(NPObject *obj);
	
	static void	_Invalidate(NPObject *obj)
	{
		if (obj) {
			((Scriptable *)obj)->Invalidate();
		}
	}

	static bool _HasMethod(NPObject *npobj, NPIdentifier name) {
		return ((Scriptable *)npobj)->HasMethod(name);
	}

	static bool _Invoke(NPObject *npobj, NPIdentifier name,
						const NPVariant *args, uint32_t argCount,
						NPVariant *result) {
		return ((Scriptable *)npobj)->Invoke(name, args, argCount, result);
	}

	static bool _HasProperty(NPObject *npobj, NPIdentifier name) {
		return ((Scriptable *)npobj)->HasProperty(name);
	}

	static bool _GetProperty(NPObject *npobj, NPIdentifier name, NPVariant *result) {
		return ((Scriptable *)npobj)->GetProperty(name, result);
	}

	static bool _SetProperty(NPObject *npobj, NPIdentifier name, const NPVariant *value) {
		return ((Scriptable *)npobj)->SetProperty(name, value);
	}
	
	static bool _Enumerate(NPObject *npobj, NPIdentifier **value, uint32_t *count) {
		return ((Scriptable *)npobj)->Enumerate(value, count);
	}
};

