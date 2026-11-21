p='src/index.ts';s=open(p).read();a=s.index('function extractBalanceSheetPageIds(');b=s.index('\nfunction collectPossiblePageIds',a)
s=s[:a]+'''function extractBalanceSheetPageIds(body: any): string[] {
  // Native automation payloads contain metadata UUIDs in source. Those are
  // not pages. The triggering page lives in data.id and takes precedence.
  const triggeringId = body?.data?.id ?? body?.page?.id ??
    (body?.object === "page" ? body?.id : undefined)
  if (typeof triggeringId === "string") {
    const id = tryParsePageId(triggeringId)
    if (id) return [id]
  }
  const ids = new Set<string>()
  const selfReference = body?.["TP: Balance Sheet [Self]"] ??
    body?.tpBalanceSheetSelf ?? body?.data?.properties?.["TP: Balance Sheet [Self]"]
  if (selfReference != null) collectPossiblePageIds(selfReference, ids)
  if (ids.size === 0) {
    // Explicit manual payload fields only; never recurse through event metadata.
    for (const value of [body?.pageId, body?.page_id, body?.pageIdOrUrl, body?.pageUrl, body?.page]) {
      if (value != null) collectPossiblePageIds(value, ids)
    }
  }
  return [...ids]
}
''' + s[b:];open(p,'w').write(s)
p='tests/fx-regression.cjs';s=open(p).read();needle='let r=await exec(args(null));';s=s.replace(needle,'''assert.equal(sandbox.extractBalanceSheetPageIds({source:{automation_id:'bc93ee11-34bb-4a0e-b31e-1d4e0ec19253'},data:{object:'page',id:row.id}})[0],row.id);
assert.equal(sandbox.extractBalanceSheetPageIds({source:{automation_id:'bc93ee11-34bb-4a0e-b31e-1d4e0ec19253'}}).length,0);
''' + needle);open(p,'w').write(s)