maxVf = 200

head = """// Copyright qiuc12@gmail.com
// This file is generated autmatically by python. DONT MODIFY IT!

#pragma once
#include <OleAuto.h>

class FakeDispatcherBase : public IDispatch {
private:
"""
pattern = """
\tvirtual HRESULT fv{0}(char x) {{
\t\tva_list va = &x;
\t\tHRESULT ret = ProcessCommand({0}, va);
\t\tva_end(va);
\t\treturn ret;
\t}}
"""
end = """
protected:
\tconst static int kMaxVf = {0};
\tvirtual HRESULT ProcessCommand(int commandId, va_list &va) = 0;
}};
"""
f = open("FakeDispatcherBase.h", "w")
f.write(head);

for i in range(0, maxVf):
    f.write(pattern.format(i))

f.write(end.format(maxVf))
    
