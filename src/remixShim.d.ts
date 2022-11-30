declare function readConfig(path: string): Promise<any>;
declare function formatRoutesAsJson(routes: any): string;

export { readConfig, formatRoutesAsJson };
