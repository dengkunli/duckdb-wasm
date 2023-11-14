const OPFS_PREFIX = 'opfs://';
const PATH_SEP_REGEX = /\/|\\/;

export async function getAsyncHandle(path: string): Promise<FileSystemFileHandle> {
    const opfsRoot = await navigator.storage.getDirectory();
    let dirHandle: FileSystemDirectoryHandle = opfsRoot;
    // check if mkdir -p is needed
    const opfsPath = path.startsWith(OPFS_PREFIX) ? path.slice(OPFS_PREFIX.length) : path;
    let fileName = opfsPath;
    if (PATH_SEP_REGEX.test(opfsPath)) {
        const folders = opfsPath.split(PATH_SEP_REGEX);
        fileName = folders.pop()!;
        if (!fileName) {
            throw new Error(`Invalid path ${path}`);
        }
        // mkdir -p
        for (const folder of folders) {
            dirHandle = await dirHandle.getDirectoryHandle(folder, { create: true });
        }
    }
    const fileHandle = await dirHandle.getFileHandle(fileName, { create: false }).catch(e => {
        if (e?.name === 'NotFoundError') {
            console.log(`File ${path} does not exists yet, creating`);
            return dirHandle.getFileHandle(fileName, { create: true });
        }
        throw e;
    });
    return fileHandle;
}

interface IGetSyncHandleOptions {
    path?: string;
    handle?: FileSystemFileHandle;
    mode?: string;
}

export async function getSyncHandle(options: IGetSyncHandleOptions): Promise<FileSystemSyncAccessHandle> {
    if (!options.path && !options.handle) {
        throw new Error('getSyncHandle: Either path or fileHandle must be provided');
    }
    const handle = options.handle || (await getAsyncHandle(options.path!));
    // Note: Since Chrome 121, multiple readers and writers is supported for FileSystemSyncAccessHandle,
    //       but the typescript interface is not yet updated, so we temporarily use @ts-ignore here.
    // See: https://developer.chrome.com/blog/new-dev-trial-for-multiple-readers-and-writers/
    // return await handle.createSyncAccessHandle();
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return await handle.createSyncAccessHandle({
        mode: 'readwrite-unsafe' || options.mode || 'readwrite-unsafe',
    });
}
