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


#include "atlthunk.h"

#define WIN32_LEAN_AND_MEAN
#include <Windows.h>
#include <stdio.h>
#include "ApiHook\Hook.h"

typedef struct tagEXCEPTION_REGISTER
{
	tagEXCEPTION_REGISTER *prev;
	_except_handler_type handler;
}EXCEPTION_REGISTER, *LPEXCEPTION_REGISTER;

/* Supported patterns:
	C7 44 24 04 XX XX XX XX   mov [esp+4], imm32
	E9 YY YY YY YY            jmp imm32

	B9 XX XX XX XX            mov ecx, imm32
	E9 YY YY YY YY            jmp imm32

	BA XX XX XX XX            mov edx, imm32
	B9 YY YY YY YY            mov ecx, imm32
	FF E1                     jmp ecx

	B9 XX XX XX XX            mov ecx, imm32
	B8 YY YY YY YY            mov eax, imm32
	FF E0                     jmp eax

	59                        pop ecx
	58                        pop eax
	51                        push ecx
	FF 60 04                  jmp [eax+4]
*/

/* Pattern 1:
	C7 44 24 04 XX XX XX XX   mov [esp+4], imm32
	E9 YY YY YY YY            jmp imm32
	*/
BYTE pattern1[] = {0xC7, 0x44, 0x24, 0x04, 0, 0, 0, 0, 0xE9, 0, 0, 0, 0};
void _process_pattern1(struct _CONTEXT *ContextRecord) {
	LPDWORD esp = (LPDWORD)(ContextRecord->Esp);
	DWORD imm1 = *(LPDWORD)(ContextRecord->Eip + 4);
	DWORD imm2 = *(LPDWORD)(ContextRecord->Eip + 9);
	esp[1] = imm1;
	ContextRecord->Eip += imm2 + 13;
}

/* Pattern 2:
	B9 XX XX XX XX            mov ecx, imm32
	E9 YY YY YY YY            jmp imm32
*/
BYTE pattern2[] = {0xB9, 0, 0, 0, 0, 0xE9, 0, 0, 0, 0};
void _process_pattern2(struct _CONTEXT *ContextRecord) {
	DWORD imm1 = *(LPDWORD)(ContextRecord->Eip + 1);
	DWORD imm2 = *(LPDWORD)(ContextRecord->Eip + 6);
	ContextRecord->Ecx = imm1;
	ContextRecord->Eip += imm2 + 10;
}

/* Pattern 3:
	BA XX XX XX XX            mov edx, imm32
	B9 YY YY YY YY            mov ecx, imm32
	FF E1                     jmp ecx
	*/
BYTE pattern3[] = {0xBA, 0, 0, 0, 0, 0xB9, 0, 0, 0, 0, 0xFF, 0xE1};
void _process_pattern3(struct _CONTEXT *ContextRecord) {
	DWORD imm1 = *(LPDWORD)(ContextRecord->Eip + 1);
	DWORD imm2 = *(LPDWORD)(ContextRecord->Eip + 6);
	ContextRecord->Edx = imm1;
	ContextRecord->Ecx = imm2;
	ContextRecord->Eip += imm2;
}
/*
	B9 XX XX XX XX            mov ecx, imm32
	B8 YY YY YY YY            mov eax, imm32
	FF E0                     jmp eax
	*/
BYTE pattern4[] = {0xB9, 0, 0, 0, 0, 0xB8, 0, 0, 0, 0, 0xFF, 0xE0};
void _process_pattern4(struct _CONTEXT *ContextRecord) {
	DWORD imm1 = *(LPDWORD)(ContextRecord->Eip + 1);
	DWORD imm2 = *(LPDWORD)(ContextRecord->Eip + 6);
	ContextRecord->Ecx = imm1;
	ContextRecord->Eax = imm2;
	ContextRecord->Eip += imm2;
}

	/*
	59                        pop ecx
	58                        pop eax
	51                        push ecx
	FF 60 04                  jmp [eax+4]
	*/
BYTE pattern5[] = {0x59, 0x58, 0x51, 0xFF, 0x60, 0x04};
void _process_pattern5(struct _CONTEXT *ContextRecord) {
	LPDWORD stack = (LPDWORD)(ContextRecord->Esp);
	ContextRecord->Ecx = stack[0];
	ContextRecord->Eax = stack[1];
	stack[1] = stack[0];
	ContextRecord->Esp += 4;
	ContextRecord->Eip = *(LPDWORD)(ContextRecord->Eax + 4);
}

ATL_THUNK_PATTERN patterns[] = {
	{pattern1, sizeof(pattern1), _process_pattern1},
	{pattern2, sizeof(pattern2), _process_pattern2},
	{pattern3, sizeof(pattern3), _process_pattern3},
	{pattern4, sizeof(pattern4), _process_pattern4},
	{pattern5, sizeof(pattern5), _process_pattern5} };
	
ATL_THUNK_PATTERN *match_patterns(LPVOID eip)
{
	LPBYTE codes = (LPBYTE)eip;
	for (int i = 0; i < sizeof(patterns) / sizeof(patterns[0]); ++i) {
		BOOL match = TRUE;
		for (int j = 0; j < patterns[i].pattern_size && match; ++j) {
			if (patterns[i].pattern[j] != 0 && patterns[i].pattern[j] != codes[j])
				match = FALSE;
		}
		if (match) {
			return &patterns[i];
		}
	}
	return NULL;
}

EXCEPTION_DISPOSITION
__cdecl
_except_handler_atl_thunk(
struct _EXCEPTION_RECORD *ExceptionRecord,
void * EstablisherFrame,
struct _CONTEXT *ContextRecord,
void * DispatcherContext )
{
	if ((ExceptionRecord->ExceptionFlags)
		|| ExceptionRecord->ExceptionCode != STATUS_ACCESS_VIOLATION
		|| ExceptionRecord->ExceptionAddress != (LPVOID)ContextRecord->Eip) {
		// Not expected Access violation exception
		return ExceptionContinueSearch;
	}

	// Try to match patterns
	ATL_THUNK_PATTERN *pattern = match_patterns((LPVOID)ContextRecord->Eip);
	if (pattern) {
		//DWORD old;
		// We can't always protect the ATL by except_handler, so we mark it executable.
		//BOOL ret = VirtualProtect((LPVOID)ContextRecord->Eip, pattern->pattern_size, PAGE_EXECUTE_READWRITE, &old);
		pattern->enumerator(ContextRecord);
		return ExceptionContinueExecution;
	}
	else {
		return ExceptionContinueSearch;
	}
}
#ifndef ATL_THUNK_APIHOOK
_except_handler_type original_handler4;
#else
HOOKINFO hook_handler;
#endif
#if 0
EXCEPTION_DISPOSITION
__cdecl
my_except_handler4(
    struct _EXCEPTION_RECORD *ExceptionRecord,
    void * EstablisherFrame,
    struct _CONTEXT *ContextRecord,
    void * DispatcherContext )
{
	//assert(original_handler);
	EXCEPTION_DISPOSITION step1 = _except_handler_atl_thunk(ExceptionRecord, 
		EstablisherFrame,
		ContextRecord,
		DispatcherContext);
	if (step1 == ExceptionContinueExecution)
		return step1;
#ifndef ATL_THUNK_APIHOOK
	_except_handler_type original_handler = original_handler4;
#else
	_except_handler_type original_handler = (_except_handler_type)hook_handler4.Stub;
#endif
	return original_handler(ExceptionRecord, EstablisherFrame, ContextRecord, DispatcherContext);
}

EXCEPTION_DISPOSITION
__cdecl
my_except_handler3(
    struct _EXCEPTION_RECORD *ExceptionRecord,
    void * EstablisherFrame,
    struct _CONTEXT *ContextRecord,
    void * DispatcherContext )
{
	//assert(original_handler);
	EXCEPTION_DISPOSITION step1 = _except_handler_atl_thunk(ExceptionRecord, 
		EstablisherFrame,
		ContextRecord,
		DispatcherContext);
	if (step1 == ExceptionContinueExecution)
		return step1;
#ifndef ATL_THUNK_APIHOOK
	// We won't wrap handler3, this shouldn't be used..
	_except_handler_type original_handler = original_handler3;
#else
	_except_handler_type original_handler = (_except_handler_type)hook_handler4.Stub;
#endif
	return original_handler(ExceptionRecord, EstablisherFrame, ContextRecord, DispatcherContext);
}
#endif

BOOL CheckDEPEnabled()
{
	// In case of running in a XP SP2.
	HMODULE hInst = LoadLibrary(TEXT("Kernel32.dll"));
	typedef BOOL (WINAPI *SetProcessDEPPolicyType)(
	  __in   DWORD dwFlags
	);
	typedef BOOL (WINAPI *GetProcessDEPPolicyType)(
	  __in   HANDLE hProcess,
	  __out  LPDWORD lpFlags,
	  __out  PBOOL lpPermanent
	);
	SetProcessDEPPolicyType setProc = (SetProcessDEPPolicyType)GetProcAddress(hInst, "SetProcessDEPPolicy");
	GetProcessDEPPolicyType getProc = (GetProcessDEPPolicyType)GetProcAddress(hInst, "GetProcessDEPPolicy");
	if (setProc) {
		// This is likely to fail, but we set it first.
		setProc(PROCESS_DEP_ENABLE);
	}
	BOOL enabled = FALSE;
	DWORD lpFlags;
	BOOL lpPermanent;
	if (getProc && getProc(GetCurrentProcess(), &lpFlags, &lpPermanent))
	{
		enabled = (lpFlags == (PROCESS_DEP_DISABLE_ATL_THUNK_EMULATION | PROCESS_DEP_ENABLE));
	}
	return enabled;
}
extern "C" void _KiUserExceptionDispatcher_hook();
extern "C" DWORD _KiUserExceptionDispatcher_origin;
extern "C" DWORD _KiUserExceptionDispatcher_ATL_p;
typedef void  (__stdcall *ZwContinueType)(struct _CONTEXT *, int);
ZwContinueType ZwContinue;

int __cdecl
_KiUserExceptionDispatcher_ATL(
struct _EXCEPTION_RECORD *ExceptionRecord,
struct _CONTEXT *ContextRecord) {
	if (_except_handler_atl_thunk(ExceptionRecord, NULL, ContextRecord, NULL) == ExceptionContinueExecution) {
		ZwContinue(ContextRecord, 0);
	}
	return 0;
}

void InstallAtlThunkEnumeration() {
	static bool installed = false;
	if (installed)
		return;
	installed = true;
	if (CheckDEPEnabled()) {
#ifndef ATL_THUNK_APIHOOK
		// Chrome is protected by DEP.
		EXCEPTION_REGISTER *reg;
		__asm {
			mov eax, fs:[0]
			mov reg, eax
		}
		while ((DWORD)reg->prev != 0xFFFFFFFF)
			reg = reg->prev;
		// replace the old handler
		original_handler = reg->handler;
		reg->handler = _except_handler;
#else
		_KiUserExceptionDispatcher_ATL_p = (DWORD)_KiUserExceptionDispatcher_ATL;
		ZwContinue = (ZwContinueType) GetProcAddress(GetModuleHandle(TEXT("ntdll")), "ZwContinue");
		HEInitHook(&hook_handler, GetProcAddress(GetModuleHandle(TEXT("ntdll")), "KiUserExceptionDispatcher") , _KiUserExceptionDispatcher_hook);
		HEStartHook(&hook_handler);
		_KiUserExceptionDispatcher_origin = (DWORD)hook_handler.Stub;
#endif
	}
}