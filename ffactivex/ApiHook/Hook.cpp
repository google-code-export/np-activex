// (c) Code By Extreme
// Description:Inline Hook Engine
// Last update:2010-6-26

#include <Windows.h>
#include <stdio.h>
#include "Hook.h"

#define JMPSIZE 5
#define NOP 0x90
extern DWORD ade_getlength(LPVOID Start, DWORD WantLength);

static VOID BuildJmp(PBYTE Buffer,DWORD JmpFrom, DWORD JmpTo)
{
	DWORD JmpAddr;

	JmpAddr = JmpFrom - JmpTo - JMPSIZE;

	Buffer[0] = 0xE9;
	Buffer[1] = (BYTE)(JmpAddr & 0xFF);
	Buffer[2] = (BYTE)((JmpAddr >> 8) & 0xFF);
	Buffer[3] = (BYTE)((JmpAddr >> 16) & 0xFF);
	Buffer[4] = (BYTE)((JmpAddr >> 24) & 0xFF);
}

VOID HEInitHook(PHOOKINFO HookInfo, LPVOID FuncAddr, LPVOID FakeAddr)
{
	HookInfo->FakeAddr = FakeAddr;
	HookInfo->FuncAddr = FuncAddr;
	return;
}

BOOL HEStartHook(PHOOKINFO HookInfo)
{
	BOOL CallRet;
	BOOL FuncRet = 0;
	PVOID BufAddr;
	DWORD dwTmp;
	DWORD OldProtect;
	
	LPVOID FuncAddr;
	DWORD CodeLength;

	// Init the basic value
	FuncAddr = HookInfo->FuncAddr;
	CodeLength = ade_getlength(FuncAddr, JMPSIZE);
	HookInfo->CodeLength = CodeLength;

	if (HookInfo->FakeAddr == NULL
		|| FuncAddr == NULL
		|| CodeLength == NULL)
	{
		FuncRet = 1;
		goto Exit1;
	}

	// Alloc buffer to store the code then write them to the head of the function
	BufAddr = malloc(CodeLength);
	if (BufAddr == NULL)
	{
		FuncRet = 2;
		goto Exit1;
	}

	// Alloc buffer to store original code
	HookInfo->Stub = (PBYTE)malloc(CodeLength + JMPSIZE);
	if (HookInfo->Stub == NULL)
	{
		FuncRet = 3;
		goto Exit2;
	}

	// Fill buffer to nop. This could make hook stable
	FillMemory(BufAddr, CodeLength, NOP);
	// Build buffers
	BuildJmp((PBYTE)BufAddr, (DWORD)HookInfo->FakeAddr, (DWORD)FuncAddr);
	BuildJmp(&(HookInfo->Stub[CodeLength]), (DWORD)((PBYTE)FuncAddr + CodeLength), (DWORD)((PBYTE)HookInfo->Stub + CodeLength));

	// [V1.1] Bug fixed: VirtualProtect Stub
	CallRet = VirtualProtect(HookInfo->Stub, CodeLength, PAGE_EXECUTE_READWRITE, &OldProtect);
	if (!CallRet)
	{
		FuncRet = 4;
		goto Exit3;
	}

	// Set the block of memory could be read and write
	CallRet = VirtualProtect(FuncAddr, CodeLength, PAGE_EXECUTE_READWRITE, &OldProtect);
	if (!CallRet)
	{
		FuncRet = 4;
		goto Exit3;
	}

	// Copy the head of function to stub
	CallRet = ReadProcessMemory(GetCurrentProcess(), FuncAddr, HookInfo->Stub, CodeLength, &dwTmp);
	if (!CallRet || dwTmp != CodeLength)
	{
		FuncRet = 5;
		goto Exit3;
	}

	// Write hook code back to the head of the function
	CallRet = WriteProcessMemory(GetCurrentProcess(), FuncAddr, BufAddr, CodeLength, &dwTmp);
	if (!CallRet || dwTmp != CodeLength)
	{
		FuncRet = 6;
		goto Exit3;
	}

	// Make hook stable
	FlushInstructionCache(GetCurrentProcess(), FuncAddr, CodeLength);
	VirtualProtect(FuncAddr, CodeLength, OldProtect, &dwTmp);

	// All done
	goto Exit2;

	// Error handle
Exit3:
	free(HookInfo->Stub);
Exit2:
	free (BufAddr);
Exit1:
	return FuncRet;
}

BOOL HEStopHook(PHOOKINFO HookInfo)
{
	BOOL CallRet;
	DWORD dwTmp;
	DWORD OldProtect;

	LPVOID FuncAddr = HookInfo->FuncAddr;
	DWORD CodeLength = HookInfo->CodeLength;

	CallRet = VirtualProtect(FuncAddr, CodeLength, PAGE_EXECUTE_READWRITE, &OldProtect);
	if (!CallRet)
	{
		return 1;
	}

	CallRet = WriteProcessMemory(GetCurrentProcess(), FuncAddr, HookInfo->Stub, CodeLength, &dwTmp);
	if (!CallRet || dwTmp != CodeLength)
	{
		return 2;
	}

	FlushInstructionCache(GetCurrentProcess(), FuncAddr, CodeLength);

	VirtualProtect(FuncAddr, CodeLength, OldProtect, &dwTmp);	

	free(HookInfo->Stub);
	return 0;
}