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

#pragma once

#include <Windows.h>

EXCEPTION_DISPOSITION
__cdecl
_except_handler(
    struct _EXCEPTION_RECORD *ExceptionRecord,
    void * EstablisherFrame,
    struct _CONTEXT *ContextRecord,
    void * DispatcherContext );

typedef EXCEPTION_DISPOSITION
(__cdecl *_except_handler_type)(
    struct _EXCEPTION_RECORD *ExceptionRecord,
    void * EstablisherFrame,
    struct _CONTEXT *ContextRecord,
    void * DispatcherContext );

typedef struct tagATL_THUNK_PATTERN
{
	LPBYTE pattern;
	int pattern_size;
	(void)(*enumerator)(struct _CONTEXT *);
}ATL_THUNK_PATTERN;
/*
{
DWORD handler = (DWORD)_except_handler;
     __asm
     {                         
         push    handler       
         push    FS:[0]        
         mov     FS:[0],ESP    
	 }}
*/
#define BEGIN_ATL_THUNK // {__asm push _except_handler __asm push FS:[0] __asm mov FS:[0],ESP}

void InstallAtlThunkEnumeration();

	 /*
	 __asm
     {                           // Remove our EXECEPTION_REGISTRATION record
         mov     eax,[ESP]       // Get pointer to previous record
         mov     FS:[0], EAX     // Install previous record
         add     esp, 8          // Clean our EXECEPTION_REGISTRATION off stack
     }
	 */
#define END_ATL_THUNK //{	 __asm mov eax, [esp] __asm mov FS:[0], EAX  __asm add esp, 8}