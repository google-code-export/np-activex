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

// npactivex.cpp : Defines the exported functions for the DLL application.
//

#include "npactivex.h"
#include "atlthunk.h"
#include "axhost.h"
#include "atlutil.h"
#include "objectProxy.h"

#include "authorize.h"
#include "common\PropertyList.h"
#include "common\ControlSite.h"

#include "ObjectManager.h"

// A list of trusted domains
// Each domain name may start with a '*' to specify that sub domains are 
// trusted as well
// Note that a '.' is not enforced after the '*'
static const char *TrustedLocations[] = {NULL};
static const unsigned int numTrustedLocations = 0;

static const char *LocalhostName = "localhost";
static const bool TrustLocalhost = true;

//
// Gecko API
//

static const char PARAM_ID[] = "id";
static const char PARAM_CLSID[] = "clsid";
static const char PARAM_CLASSID[] = "classid";
static const char PARAM_PROGID[] = "progid";
static const char PARAM_DEBUG[] = "debugLevel";
static const char PARAM_LOGGER[] = "logger";
static const char PARAM_CODEBASEURL [] = "codeBase";
static const char PARAM_ONEVENT[] = "Event_";

static unsigned int log_level = 5;

void
log_activex_logging(NPP instance, unsigned int level, const char* filename, int line, char *message, ...) {
	if (instance == NULL || level > log_level) {
		return;
	}
	NPVariantProxy result1;
	NPObjectProxy globalObj = NULL;
	NPIdentifier commandId = NPNFuncs.getstringidentifier("__npactivex_log");
	NPNFuncs.getvalue(instance, NPNVWindowNPObject, &globalObj);
	if (!NPNFuncs.hasmethod(instance, globalObj, commandId)) {
		return;
	}
	int size = 0;

	va_list list;

	ATL::CStringA str;
	va_start(list, message);
	str.FormatV(message, list);
	va_end(list);
	NPVariant vars[4];
	STRINGZ_TO_NPVARIANT(filename, vars[0]);
	INT32_TO_NPVARIANT(line, vars[1]);
	int instid = (int)(instance);
	INT32_TO_NPVARIANT(instid, vars[2]);
	const char* formatted = str.GetString();
	STRINGZ_TO_NPVARIANT(formatted, vars[3]);
	NPNFuncs.invoke(instance, globalObj, commandId, vars, 4, &result1);
}
void InstallLogAction(NPP instance) {
	NPVariantProxy result1;
	NPObjectProxy globalObj = NULL;
	NPIdentifier commandId = NPNFuncs.getstringidentifier("__npactivex_log");
	NPNFuncs.getvalue(instance, NPNVWindowNPObject, &globalObj);
	if (NPNFuncs.hasmethod(instance, globalObj, commandId)) {
		return;
	}
	const char* definition = "function __npactivex_log(file,line,instid,message){var controlLogEvent=\"__npactivex_log_event__\";var data=new Object;data.file=file;data.line=line;data.objId=instid;data.message=message;var stringData=JSON.stringify(data);var e=document.createEvent(\"TextEvent\");e.initTextEvent(controlLogEvent,false,false,null,stringData);window.dispatchEvent(e)}";
	NPString def;
	def.UTF8Characters = definition;
	def.UTF8Length = strlen(definition);
	NPNFuncs.evaluate(instance, globalObj, &def, &result1);
}
void
log_internal_console(NPP instance, unsigned int level, char *message, ...)
{
	NPVariantProxy result1, result2;
	NPVariant args;
	NPObjectProxy globalObj = NULL, consoleObj = NULL;
	bool rc = false;
	char *formatted = NULL;
	char *new_formatted = NULL;
	int buff_len = 0;
	int size = 0;

	va_list list;

	if (level > log_level) {

		return;
	}

	buff_len = strlen(message);
	char *new_message = (char *)malloc(buff_len + 10);
	sprintf(new_message, "%%s %%d: %s", message);
	buff_len += buff_len / 10;
	formatted = (char *)calloc(1, buff_len);
	while (true) {

		va_start(list, message);
		size = vsnprintf_s(formatted, buff_len, _TRUNCATE, new_message, list);
		va_end(list);

		if (size > -1 && size < buff_len)
			break;

		buff_len *= 2;
		new_formatted = (char *)realloc(formatted, buff_len);
		if (NULL == new_formatted) {

			free(formatted);
			return;
		}

		formatted = new_formatted;
		new_formatted = NULL;
	}
	free(new_message);
	if (instance == NULL) {
		free(formatted);
		return;
	}
	NPNFuncs.getvalue(instance, NPNVWindowNPObject, &globalObj);
	if (NPNFuncs.getproperty(instance, globalObj, NPNFuncs.getstringidentifier("console"), &result1)) {
		consoleObj = NPVARIANT_TO_OBJECT(result1);
		NPIdentifier handler = NPNFuncs.getstringidentifier("log");

		STRINGZ_TO_NPVARIANT(formatted, args);
		bool success = NPNFuncs.invoke(instance, consoleObj, handler, &args, 1, &result2);
	}
	free(formatted);
}

static bool
MatchURL2TrustedLocations(NPP instance, LPCTSTR matchUrl)
{
	USES_CONVERSION;
	BOOL rc = false;
	CUrl url;

	if (!numTrustedLocations) {

		return true;
	}

	rc = url.CrackUrl(matchUrl, ATL_URL_DECODE);
	if (!rc) {

		np_log(instance, 0, "AxHost.MatchURL2TrustedLocations: failed to parse the current location URL");
		return false;
	}
	
	if (   (url.GetScheme() == ATL_URL_SCHEME_FILE) 
		|| (!strncmp(LocalhostName, W2A(url.GetHostName()), strlen(LocalhostName)))){

		return TrustLocalhost;
	}

	for (unsigned int i = 0; i < numTrustedLocations; ++i) {

		if (TrustedLocations[i][0] == '*') {
			// sub domains are trusted
			unsigned int len = strlen(TrustedLocations[i]);
			bool match = 0;

			if (url.GetHostNameLength() < len) {
				// can't be a match
				continue;
			}

			--len; // skip the '*'
			match = strncmp(W2A(url.GetHostName()) + (url.GetHostNameLength() - len),	// anchor the comparison to the end of the domain name
							TrustedLocations[i] + 1,									// skip the '*'
							len) == 0 ? true : false;
			if (match) {

				return true;
			}
		}
		else if (!strncmp(W2A(url.GetHostName()), TrustedLocations[i], url.GetHostNameLength())) {

			return true;
		}
	}

	return false;
}

static bool
VerifySiteLock(NPP instance)
{
	// This approach is not used.
	return true;
#if 0
	USES_CONVERSION;
	NPObjectProxy globalObj;
	NPIdentifier identifier;
	NPVariantProxy varLocation;
	NPVariantProxy varHref;
	bool rc = false;

	// Get the window object.
	NPNFuncs.getvalue(instance, NPNVWindowNPObject, &globalObj);
	// Create a "location" identifier.
	identifier = NPNFuncs.getstringidentifier("location");

	// Get the location property from the window object (which is another object).
	rc = NPNFuncs.getproperty(instance, globalObj, identifier, &varLocation);
	if (!rc){

		np_log(instance, 0, "AxHost.VerifySiteLock: could not get the location from the global object");
		return false;
	}

	// Get a pointer to the "location" object.
	NPObject *locationObj = varLocation.value.objectValue;
	// Create a "href" identifier.
	identifier = NPNFuncs.getstringidentifier("href");
	// Get the location property from the location object.
	rc = NPNFuncs.getproperty(instance, locationObj, identifier, &varHref);
	if (!rc) {

		np_log(instance, 0, "AxHost.VerifySiteLock: could not get the href from the location property");
		return false;
	}

	rc = MatchURL2TrustedLocations(instance, A2W(varHref.value.stringValue.UTF8Characters));

	if (false == rc) {

		np_log(instance, 0, "AxHost.VerifySiteLock: current location is not trusted");
	}

	return rc;
#endif
}

static bool FillProperties(CAxHost *host, NPP instance) {
	NPObjectProxy embed;
	NPNFuncs.getvalue(instance, NPNVPluginElementNPObject, &embed);
	// Traverse through childs
	NPVariantProxy var_childNodes;
	NPVariantProxy var_length;
	NPVariant str_name, str_value;
	if (!NPNFuncs.getproperty(instance, embed, NPNFuncs.getstringidentifier("childNodes"), &var_childNodes))
		return true;
	if (!NPVARIANT_IS_OBJECT(var_childNodes))
		return true;

	NPObject *childNodes = NPVARIANT_TO_OBJECT(var_childNodes);

	VOID_TO_NPVARIANT(var_length);
	if (!NPNFuncs.getproperty(instance, childNodes, NPNFuncs.getstringidentifier("length"), &var_length))
		return true;
	USES_CONVERSION;

	int length = 0;
	if (NPVARIANT_IS_INT32(var_length))
		length = NPVARIANT_TO_INT32(var_length);
	if (NPVARIANT_IS_DOUBLE(var_length))
		length = static_cast<int>(NPVARIANT_TO_DOUBLE(var_length));
	NPIdentifier idname = NPNFuncs.getstringidentifier("nodeName");
	NPIdentifier idAttr = NPNFuncs.getstringidentifier("getAttribute");

	STRINGZ_TO_NPVARIANT("name", str_name);
	STRINGZ_TO_NPVARIANT("value", str_value);
	for (int i = 0; i < length; ++i) {
		NPIdentifier id = NPNFuncs.getintidentifier(i);
		NPVariantProxy var_par;
		NPVariantProxy var_nodeName, var_parName, var_parValue;
		if (!NPNFuncs.getproperty(instance, childNodes, id, &var_par))
			continue;
		if (!NPVARIANT_IS_OBJECT(var_par))
			continue;
		NPObject *param_obj = NPVARIANT_TO_OBJECT(var_par);

		if (!NPNFuncs.getproperty(instance, param_obj, idname, &var_nodeName))
			continue;
		if (_strnicmp(NPVARIANT_TO_STRING(var_nodeName).UTF8Characters, "embed", NPVARIANT_TO_STRING(var_nodeName).UTF8Length) == 0) {
			NPVariantProxy type;
			NPVariant typestr;
			STRINGZ_TO_NPVARIANT("type", typestr);
			if (!NPNFuncs.invoke(instance, param_obj, idAttr, &typestr, 1, &type))
				continue;
			if (!NPVARIANT_IS_STRING(type))
				continue;
			CStringA command, mimetype(NPVARIANT_TO_STRING(type).UTF8Characters, NPVARIANT_TO_STRING(type).UTF8Length);
			command.Format("navigator.mimeTypes[\'%s\'] != null", mimetype);
			NPString str = {command.GetString(), command.GetLength()};
			NPVariantProxy value;
			NPObjectProxy window;
			NPNFuncs.getvalue(instance, NPNVWindowNPObject, &window);
			NPNFuncs.evaluate(instance, window, &str, &value);
			if (NPVARIANT_IS_BOOLEAN(value) && NPVARIANT_TO_BOOLEAN(value)) {
				// The embed is supported by chrome. Fallback automatically.
				return false;
			}
		}
		if (_strnicmp(NPVARIANT_TO_STRING(var_nodeName).UTF8Characters, "param", NPVARIANT_TO_STRING(var_nodeName).UTF8Length) != 0)
			continue;

		if (!NPNFuncs.invoke(instance, param_obj, idAttr, &str_name, 1, &var_parName))
			continue;
		if (!NPNFuncs.invoke(instance, param_obj, idAttr, &str_value, 1, &var_parValue))
			continue;
		if (!NPVARIANT_IS_STRING(var_parName) || !NPVARIANT_IS_STRING(var_parValue))
			continue;

		CComBSTR paramName(NPVARIANT_TO_STRING(var_parName).UTF8Length, NPVARIANT_TO_STRING(var_parName).UTF8Characters);
        CComBSTR paramValue(NPVARIANT_TO_STRING(var_parValue).UTF8Length, NPVARIANT_TO_STRING(var_parValue).UTF8Characters);

        // Add named parameter to list
        CComVariant v(paramValue);
        host->Props()->AddOrReplaceNamedProperty(paramName, v);
	}
	return true;

}

NPError CreateControl(NPP instance, int16 argc, char *argn[], char *argv[], CAxHost **phost) {
	// Create a plugin instance, the actual control will be created once we 
	// are given a window handle
	USES_CONVERSION;
	PropertyList events;
	CAxHost *host = new CAxHost(instance);
	*phost = host;
	if (!host) {

		np_log(instance, 0, "AxHost.NPP_New: failed to allocate memory for a new host");
		return NPERR_OUT_OF_MEMORY_ERROR;
	}

	// Iterate over the arguments we've been passed
	for (int i = 0; i < argc; ++i) {
		// search for any needed information: clsid, event handling directives, etc.
		if (strnicmp(argn[i], PARAM_CLASSID, sizeof(PARAM_CLASSID)) == 0) {
			char clsid[100];
			strncpy(clsid, argv[i], 80);
			strcat(clsid, "}");
			char* id = strchr(clsid, ':');
			if (id == NULL)
				continue;
			*id = '{';
			host->setClsID(id);
		}
		else if (0 == strnicmp(argn[i], PARAM_CLSID, sizeof(PARAM_CLSID))) {
			// The class id of the control we are asked to load

			host->setClsID(argv[i]);
		}
		else if (0 == strnicmp(argn[i], PARAM_PROGID, sizeof(PARAM_PROGID))) {
			// The class id of the control we are asked to load
			host->setClsIDFromProgID(argv[i]);
		}
		else if (0 == strnicmp(argn[i], PARAM_DEBUG, sizeof(PARAM_DEBUG))) {
			// Logging verbosity
			log_level = atoi(argv[i]);
		}
		else if (0 == strnicmp(argn[i], PARAM_LOGGER, sizeof(PARAM_LOGGER))) {
			// Logger function
			// logger = strdup(argv[i]);
		}
		else if (0 == strnicmp(argn[i], PARAM_ONEVENT, sizeof(PARAM_ONEVENT))) {
			// A request to handle one of the activex's events in JS
			events.AddOrReplaceNamedProperty(A2W(argn[i] + strlen(PARAM_ONEVENT)), CComVariant(A2W(argv[i])));
		}
		else if(0  == strnicmp(argn[i], PARAM_CODEBASEURL, sizeof(PARAM_CODEBASEURL))) {
			if (MatchURL2TrustedLocations(instance, A2W(argv[i]))) {
				host->setCodeBaseUrl(A2W(argv[i]));
			}
			else {
				np_log(instance, 0, "AxHost.NPP_New: codeBaseUrl contains an untrusted location");
			}
		}
	}

	if (!FillProperties(host, instance)) {
		return NPERR_GENERIC_ERROR;
	}
	// Make sure we have all the information we need to initialize a new instance
	if (!host->hasValidClsID()) {
		np_log(instance, 0, "AxHost.NPP_New: no valid CLSID or PROGID");
		return NPERR_INVALID_PARAM;
	}

	instance->pdata = host;

	// if no events were requested, don't fail if subscribing fails
	if (!host->CreateControl(events.GetSize() ? true : false)) {
		np_log(instance, 0, "AxHost.NPP_New: failed to create the control");
		return NPERR_GENERIC_ERROR;
	}

	for (unsigned int j = 0; j < events.GetSize(); j++) {

		if (!host->AddEventHandler(events.GetNameOf(j), events.GetValueOf(j)->bstrVal)) {

			//rc = NPERR_GENERIC_ERROR;
			//break;
		}
	}
	return NPERR_NO_ERROR;
}
/* 
 * Create a new plugin instance, most probably through an embed/object HTML 
 * element.
 *
 * Any private data we want to keep for this instance can be saved into 
 * [instance->pdata].
 * [saved] might hold information a previous instance that was invoked from the
 * same URL has saved for us.
 */ 
NPError 
NPP_New(NPMIMEType pluginType,
        NPP instance, uint16 mode,
        int16 argc, char *argn[],
        char *argv[], NPSavedData *saved)
{
	NPError rc = NPERR_NO_ERROR;
	NPObject *browser = NULL;
	int16 i = 0;
	
  //_asm {int 3};

	if (!instance || (0 == NPNFuncs.size)) {

		return NPERR_INVALID_PARAM;
	}
	
	instance->pdata = NULL;

#ifdef NO_REGISTRY_AUTHORIZE
	// Verify that we're running from a trusted location
	if (!VerifySiteLock(instance)) {

	  return NPERR_GENERIC_ERROR;
	}
#else
	if (!TestAuthorization (instance,
		   				            argc,
						              argn,
							            argv,
                          pluginType)) {
      return NPERR_GENERIC_ERROR;
	  }

#endif
	InstallLogAction(instance);
	if (stricmp(pluginType, "application/x-itst-activex") == 0) {
		CAxHost *host = NULL;
		/*
		ObjectManager* manager = ObjectManager::GetManager(instance);
		if (manager && !(host = dynamic_cast<CAxHost*>(manager->GetPreviousObject(instance)))) {
			// Object is created before
			manager->RequestObjectOwnership(instance, host);
		} else 
		*/
		{
			rc = CreateControl(instance, argc, argn, argv, &host);

			if (NPERR_NO_ERROR != rc) {
				delete host;
				instance->pdata = NULL;
				host = NULL;
				return rc;
			}
		}
		if (host) {
			host->RegisterObject();
			instance->pdata = host;
		}
	} else if (stricmp(pluginType, "application/activex-manager") == 0) {
		// disabled now!!
		return rc = NPERR_GENERIC_ERROR;
		ObjectManager *manager = new ObjectManager(instance);
		manager->RegisterObject();
		instance->pdata = manager;
	}
	return rc;
}

/*
 * Destroy an existing plugin instance.
 *
 * [save] can be used to save information for a future instance of our plugin
 * that'll be invoked by the same URL.
 */
NPError 
NPP_Destroy(NPP instance, NPSavedData **save)
{

	if (!instance) {

		return NPERR_INVALID_PARAM;
	}

	CHost *host = (CHost *)instance->pdata;
	if (host) {
		
		np_log(instance, 0, "NPP_Destroy: destroying the control...");
		//host->UnRegisterObject();
		host->Release();
		instance->pdata = NULL;
		/*
		ObjectManager *manager = ObjectManager::GetManager(instance);
		CAxHost *axHost = dynamic_cast<CAxHost*>(host);
		if (manager && axHost) {
			manager->RetainOwnership(axHost);
		} else {
			np_log(instance, 0, "NPP_Destroy: destroying the control...");
			host->Release();
			instance->pdata = NULL;
		}*/
	}

	return NPERR_NO_ERROR;
}

/*
 * Sets an instance's window parameters.
 */

NPError 
NPP_SetWindow(NPP instance, NPWindow *window)
{
	CAxHost *host = NULL;
	RECT rcPos;

	if (!instance || !instance->pdata) {

		return NPERR_INVALID_PARAM;
	}

	host = dynamic_cast<CAxHost*>((CHost *)instance->pdata);
	if (host) {
		host->setWindow((HWND)window->window);
	
		rcPos.left = 0;
		rcPos.top = 0;
		rcPos.right = window->width;
		rcPos.bottom = window->height;
		host->UpdateRect(rcPos);
	
	}

	return NPERR_NO_ERROR;
}
