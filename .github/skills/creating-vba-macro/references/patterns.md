# VBA Common Patterns

## 代码格式

- 使用 JSDoc 的风格进行注释, 注释语言使用英语
- 尽量不使用 MsgBox 对话框, 对于程序状态的提示放入 LogInfo 中输出
- 每个模块文件的开头如下:

```vba
'/**
' * Global Variables Declaration Module (dat_global_variable.bas)
' *
' * Description:
' *  - Central storage for application-wide global variables
' *  - Contains development mode flags and configuration settings
' *  - Should be imported first before other modules that depend on globals
' *
' * Usage:
' *  - Modify DEBUG_MODE to enable/disable development logging
' *  - Add more global variables as needed for application state
' */
```

- 函数注释格式为:

```vba
'/**
' * Clean filename by removing special characters
' * Converts "RT-88000-70097-045-1-DD-C.pdf" to "RT-88000-70097-045-1-DD-C"
' *
' * Parameters:
' *   - rawName: Original filename
' *
' * Returns:
' *   - Cleaned filename without extension and special chars
' */
```

表明用途, 注明参数和返回值
