<#
.SYNOPSIS
G盘递归扫描脚本 - 生产版本

.DESCRIPTION
递归扫描指定目录，提取文件元数据，输出 JSON 格式
100% 只读操作，不修改任何文件
支持权限拒绝的目录跳过，确保扫描完整性

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
        [string]$DirectoryPath,
        [int]$Depth = 0
    )

    # 防止无限递归（最大深度）
    if ($Depth -gt 50) {
        return
    }

    try {
        # 获取目录中的所有项（仅读取模式）
        $items = Get-ChildItem -Path $DirectoryPath -ErrorAction SilentlyContinue -Force
        
        foreach ($item in $items) {
            # 检查是否是目录
            if ($item.PSIsContainer) {
                # 递归扫描子目录
                Scan-Directory -DirectoryPath $item.FullName -Depth ($Depth + 1)
            }
            else {
                # 处理文件 - 仅读取操作
                try {
                    # 获取文件扩展名
                    $extension = $item.Extension.ToLower()
                    
                    # 只记录PDF文件
                    if ($extension -ne '.pdf') {
                        continue
                    }
                    
                    $fileId++
                    
                    # 构建文件信息对象
                    $fileInfo = @{
                        id = $fileId
                        file_name = $item.Name
                        file_path = $item.FullName
                        file_size_bytes = $item.Length
                        last_modified_local = $item.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss")
                        file_extension = $extension
                    }
                    
                    if ($AsJson) {
                        # 输出为 JSON 行格式（每行一条JSON对象，便于流处理）
                        $fileInfo | ConvertTo-Json -Compress
                    }
                    else {
                        # 输出为对象
                        [PSCustomObject]$fileInfo
                    }
                }
                catch {
                    # 跳过无法读取的文件（权限拒绝等）
                    # 不输出错误，保证扫描继续
                }
            }
        }
    }
    catch {
        # 跳过权限拒绝的目录
        # 不输出错误，保证扫描继续
    }
}

# 执行扫描 - 100% 只读操作
Scan-Directory -DirectoryPath $TargetDir
