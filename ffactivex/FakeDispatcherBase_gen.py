maxVf = 200

head = """// Copyright qiuc12@gmail.com
// This file is generated autmatically by python. DONT MODIFY IT!

#pragma once
#include <OleAuto.h>
class FakeDispatcher;
HRESULT DualProcessCommand(int commandId, FakeDispatcher *disp, ...);
extern "C" void DualProcessCommandWrap();
class FakeDispatcherBase : public IDispatch {
private:
"""

pattern = """
\tvirtual HRESULT __stdcall fv{0}(char x) {{
\t\tva_list va = &x;
\t\tHRESULT ret = ProcessCommand({0}, va);
\t\tva_end(va);
\t\treturn ret;
\t}}
"""
pattern = """
\tvirtual HRESULT __stdcall fv{0}() {{
\t\t__asm {{
\t\t\tleave
\t\t\tpush {0}
\t\t\tjmp DualProcessCommandWrap
\t\t}}
\t}}
"""

end = """
protected:
\tconst static int kMaxVf = {0};

}};
"""
f = open("FakeDispatcherBase.h", "w")
f.write(head);

for i in range(0, maxVf):
    f.write(pattern.format(i))

f.write(end.format(maxVf))
    
