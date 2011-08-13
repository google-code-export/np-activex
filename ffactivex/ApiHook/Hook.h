#ifndef _HOOK_H_
#define _HOOK_H_

typedef struct _HOOKINFO_
{
	PBYTE Stub;
	DWORD CodeLength;
	LPVOID FuncAddr;
	LPVOID FakeAddr;
}HOOKINFO, *PHOOKINFO;

VOID HEInitHook(PHOOKINFO HookInfo, LPVOID FuncAddr, LPVOID FakeAddr);
BOOL HEStartHook(PHOOKINFO HookInfo);
BOOL HEStopHook(PHOOKINFO HookInfo);

#endif