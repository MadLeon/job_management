<#
.SYNOPSIS
本地文件夹扫描脚本 - 仅读取模式

.DESCRIPTION
递归扫描指定目录，提取文件元数据，输出 JSON 格式
100% 只读操作，不修改任何文件

.PARAMETER TargetDir
目标目录路径

.PARAMETER AsJson
输出为 JSON 格式（每行一条记录）
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$TargetDir,
    
    [Parameter(Mandatory=$false)]
    [switch]$AsJson
)

# 设置错误处理
$ErrorActionPreference = 'SilentlyContinue'

# 文件ID计数器
$fileId = 0

<#
.DESCRIPTION
递归扫描目录并输出文件信息
#>
function Scan-Directory {
    param(
        [string]$DirectoryPath
    )

    try {
        # 获取目录中的所有项
        $items = Get-ChildItem -Path $DirectoryPath -ErrorAction SilentlyContinue
        
        foreach ($item in $items) {
            if ($item.PSIsContainer) {
                # 递归扫描子目录
                Scan-Directory -DirectoryPath $item.FullName
            }
            else {
                # 处理文件
                try {
                    $fileId++
                    
                    $fileInfo = @{
                        id = $fileId
                        file_name = $item.Name
                        file_path = $item.FullName
                        file_size_bytes = $item.Length
                        last_modified_utc = $item.LastWriteTime.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
                        file_extension = $item.Extension.ToLower()
                    }
                    
                    if ($AsJson) {
                        # 输出为 JSON 行格式
                        $fileInfo | ConvertTo-Json -Compress
                    }
                    else {
                        # 输出为对象
                        [PSCustomObject]$fileInfo
                    }
                }
                catch {
                    # 跳过无法读取的文件
                }
            }
        }
    }
    catch {
        # 跳过权限拒绝的目录
        Write-Error "无法访问: $DirectoryPath" -ErrorAction SilentlyContinue
    }
}

# 执行扫描
Write-Host "[*] Start scanning: $TargetDir" -ForegroundColor Cyan
Scan-Directory -DirectoryPath $TargetDir
Write-Host "[OK] Scan complete" -ForegroundColor Green
