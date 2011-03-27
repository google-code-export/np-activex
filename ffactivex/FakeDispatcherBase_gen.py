maxVf = 200

# Generating the header
head = """// Copyright qiuc12@gmail.com
// This file is generated autmatically by python. DONT MODIFY IT!

#pragma once
#include <OleAuto.h>
class FakeDispatcher;
HRESULT DualProcessCommand(int commandId, FakeDispatcher *disp, ...);
extern "C" void DualProcessCommandWrap();
class FakeDispatcherBase : public IDispatch {
private:"""

pattern = """
\tvirtual HRESULT __stdcall fv{0}(char x) {{
\t\tva_list va = &x;
\t\tHRESULT ret = ProcessCommand({0}, va);
\t\tva_end(va);
\t\treturn ret;
\t}}
"""
pattern = """
\tvirtual HRESULT __stdcall fv{0}();"""

end = """
protected:
\tconst static int kMaxVf = {0};

}};
"""
f = open("FakeDispatcherBase.h", "w")
f.write(head)

for i in range(0, maxVf):
    f.write(pattern.format(i))

f.write(end.format(maxVf))
f.close()
head = """; Copyright qiuc12@gmail.com
; This file is generated automatically by python. DON'T MODIFY IT!
"""
f = open("FakeDispatcherBase.asm", "w")
f.write(head)
f.write(".386\n")
f.write(".model flat\n")
f.write("_DualProcessCommandWrap proto\n")
ObjFormat = "?fv{0}@FakeDispatcherBase@@EAGJXZ"
for i in range(0, maxVf):
    f.write("PUBLIC " + ObjFormat.format(i) + "\n")
f.write(".code\n")
for i in range(0, maxVf):
    f.write(ObjFormat.format(i) + " proc\n")
    f.write("  push {0}\n".format(i))
    f.write("  jmp _DualProcessCommandWrap\n")
    f.write(ObjFormat.format(i) + " endp\n")
f.write("\nend\n")
f.close()
