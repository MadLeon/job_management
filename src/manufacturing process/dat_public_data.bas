'/**
' * Global Variable Declaration
' * Used to store and access data throughout the workbook
' */

Option Explicit

' ============================================================================
' GLOBAL CONSTANTS - OUTPUT AREA DEFINITION
' ============================================================================

' Output area range constants
Public Const OUTPUT_START_ROW As Long = 11
Public Const OUTPUT_END_ROW As Long = 39
Public Const DATA_COLUMNS_START As Long = 1     ' Column A
Public Const DATA_COLUMNS_END As Long = 14      ' Column N

' ============================================================================
' GLOBAL VARIABLES - CODE & DESCRIPTION MAPPING
' ============================================================================

' Code to Description mapping
' Maps: "P" → "P  = Purchase", "FI" → "FI = Free Issued Mat'l", etc.
Public codeToDescription As Object ' Scripting.Dictionary

' Description to Code mapping (reverse mapping)
' Maps: "P  = Purchase" → "P", etc.
Public descriptionToCode As Object ' Scripting.Dictionary

' ============================================================================
' GLOBAL VARIABLES - PROCESS DATA STRUCTURE
' ============================================================================

' ProcessData structure:
' Dictionary(key: code, value: Collection)
'   - key: "P", "FI", "RT", "SC", "I", "H", "W", "PI"
'   - value: Collection of process entries
'     - Each entry is a Dictionary with:
'       - "code": the code (P, FI, RT, etc.)
'       - "type": the type/category
'       - "link": the related row number (empty if no link, else row number like 22)
'       - "process": the process description
'       - "dataRow": the row number in data sheet (for reference)
Public ProcessData As Object ' Scripting.Dictionary

' ============================================================================
' INITIALIZATION FUNCTIONS
' ============================================================================

' /**
'  * Initialize code-to-description mapping
'  * Must be called once at workbook startup
'  */
Public Sub InitializeCodeMappings()
    Dim fso As Object
    
    ' Initialize dictionaries
    Set codeToDescription = CreateObject("Scripting.Dictionary")
    Set descriptionToCode = CreateObject("Scripting.Dictionary")
    
    ' Build code → description mapping
    codeToDescription.Add "P", "P  = Purchase"
    codeToDescription.Add "FI", "FI = Free Issued Mat'l"
    codeToDescription.Add "RT", "RT = Record to Manufacture"
    codeToDescription.Add "SC", "SC = Subcontract"
    codeToDescription.Add "I", "I  = Inspect"
    codeToDescription.Add "H", "H  = Hold"
    codeToDescription.Add "W", "W  = Witness"
    codeToDescription.Add "PI", "PI = Packaging Inspection"
    
    ' Build description → code mapping (reverse)
    descriptionToCode.Add "P  = Purchase", "P"
    descriptionToCode.Add "FI = Free Issued Mat'l", "FI"
    descriptionToCode.Add "RT = Record to Manufacture", "RT"
    descriptionToCode.Add "SC = Subcontract", "SC"
    descriptionToCode.Add "I  = Inspect", "I"
    descriptionToCode.Add "H  = Hold", "H"
    descriptionToCode.Add "W  = Witness", "W"
    descriptionToCode.Add "PI = Packaging Inspection", "PI"
    
End Sub

' /**
'  * Initialize ProcessData structure (empty)
'  * Will be populated by data loading function
'  */
Public Sub InitializeProcessData()
    Dim code As Variant
    Dim codes As Variant
    
    ' Initialize ProcessData dictionary
    Set ProcessData = CreateObject("Scripting.Dictionary")
    
    ' Create entry for each code
    codes = Array("P", "FI", "RT", "SC", "I", "H", "W", "PI")
    For Each code In codes
        ProcessData.Add code, New Collection
    Next code
    
End Sub

' /**
'  * Get code description
'  * @param code: the code (e.g., "P")
'  * @return: the description (e.g., "P  = Purchase")
'  */
Public Function GetCodeDescription(code As String) As String
    If codeToDescription.Exists(code) Then
        GetCodeDescription = codeToDescription(code)
    Else
        GetCodeDescription = ""
    End If
End Function

' /**
'  * Get code from description
'  * @param description: the description (e.g., "P  = Purchase")
'  * @return: the code (e.g., "P")
'  */
Public Function GetCodeFromDescription(description As String) As String
    If descriptionToCode.Exists(description) Then
        GetCodeFromDescription = descriptionToCode(description)
    Else
        GetCodeFromDescription = ""
    End If
End Function