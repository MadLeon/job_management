Session Summary（SharePoint / OneDrive / OE CSV 同步方案）

需求背景
公司有一个 OE 日志文件：
\\rtdnas2\OE\Order Entry Log.xlsm（在内网 NAS 上，不希望移动位置）

该文件通过 VBA 宏生成 CSV 数据，用于：
SharePoint / Excel Online
Power Automate
新旧数据差异分析

目标是：
任何员工运行 OE 宏后，生成的 CSV 都能被 SharePoint / Power Automate 稳定读取

关键限制与结论
SharePoint / Power Automate 无法访问：
\\rtdnas2 这类 SMB 网络路径

它们只能访问：
SharePoint Document Library
OneDrive（本质也是 SharePoint）

最终推荐架构（标准企业方案）
在 SharePoint 创建一个 Document Library（PO Data）
给所有 OE 用户 编辑权限
用户使用 OneDrive 客户端，将该库 同步到本地
每个用户电脑上会出现类似路径：
C:\Users\xxx\Record Technology & Development\Communication site - PO Data

VBA 宏 只负责：
将 CSV 保存到该本地同步目录
不直接写 SharePoint URL
示例 VBA 路径获取方式：
SavePath = Environ("OneDriveCommercial") & "\Communication site - PO Data\xxx.csv"

OneDrive 自动同步 → CSV 出现在 SharePoint
Power Automate / Excel Online 从该库读取 CSV，进行对比与分析

核心收益
OE 文件仍保留在 NAS
不依赖用户个人 OneDrive
支持多人并发
Power Automate / Excel Online 100% 可访问
实现路径解耦、权限统一、系统稳定