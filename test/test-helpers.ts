import path from 'path';
import fs from 'fs-extra';
import { ApplierOptionsContract, HandlerContract, Binding, container, Action, Preset, cachePreset, contextualizeObject } from '@/exports';

export const STUB_DIRECTORY = path.join(__dirname, '__stubs__');
export const TARGET_DIRECTORY = path.join(__dirname, '__target__');

export const stubs = {
  HELLO_WORLD: path.join(STUB_DIRECTORY, 'presets', 'hello-world'),
};

export const resolvables = {
  GITHUB: [
    { test: 'organization/repository', organization: 'organization', repository: 'repository' },
    { test: 'org-with-dashes/repository-with-dashes', organization: 'org-with-dashes', repository: 'repository-with-dashes' },
    { test: 'https://github.com/org/repo', organization: 'org', repository: 'repo' },
    { test: 'git@github.com:org/repo', organization: 'org', repository: 'repo' },
    { test: 'git@github.com:org/repo.git', organization: 'org', repository: 'repo' },
  ],

  DISK: [{ test: stubs.HELLO_WORLD, path: stubs.HELLO_WORLD }],

  OTHERS: [{ test: 'some random string' }],
};

export function makePreset(options: Partial<ApplierOptionsContract> = {}) {
  options.args ??= [];
  options.options ??= {};
  options.resolvable ??= stubs.HELLO_WORLD;
  options.target ??= TARGET_DIRECTORY;

  const preset = cachePreset(options.resolvable, new Preset());
  preset.targetDirectory = options.target;
  preset.args = options.args;
  preset.options = options.options;

  return { options: options as ApplierOptionsContract, preset };
}

export const generateOptions = (options: Partial<ApplierOptionsContract> = {}): ApplierOptionsContract => {
  return {
    resolvable: options.resolvable ?? '',
    target: options.target ?? TARGET_DIRECTORY,
    args: options.args ?? [],
    options: {
      ...options.options,
    },
  };
};

export async function sandbox<T extends Promise<any>>(callback: (...any: any) => T): Promise<T> {
  fs.emptyDirSync(TARGET_DIRECTORY);
  const result = await callback();
  fs.emptyDirSync(TARGET_DIRECTORY);
  return result;
}

export function sandboxPath(...paths: string[]): string {
  return path.join(TARGET_DIRECTORY, ...paths);
}

export function writeToSandbox(path: string, content: string | string[]): void {
  if (Array.isArray(content)) {
    content = content.join('\n');
  }

  fs.writeFileSync(sandboxPath(path), content, { encoding: 'utf-8' });
}

export function readFromSandbox(path: string): string | undefined {
  if (!sandboxHasFile(path)) {
    return;
  }

  return fs.readFileSync(sandboxPath(path), { encoding: 'utf-8' });
}

export function sandboxHasFile(path: string): boolean {
  return fs.existsSync(sandboxPath(path));
}

export async function handleInSandbox(
  handlerName: string,
  action: Action,
  options: ApplierOptionsContract,
  test: (result?: any) => Promise<void> | void,
  before?: () => Promise<void> | void,
) {
  return await sandbox(async () => {
    await before?.();
    const result = await container
      .getNamed<HandlerContract>(Binding.Handler, handlerName)
      .handle(contextualizeObject(action.preset, action), options);

    await test(result);
  });
}
