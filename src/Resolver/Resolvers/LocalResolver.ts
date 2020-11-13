import path from 'path';
import fs from 'fs-extra';
import { injectable } from 'inversify';
import { ResolutionError, ResolverContract, ResolverOptions, ResolverResult } from '@/exports';

@injectable()
export class LocalResolver implements ResolverContract {
  public name: string = 'local';

  async resolve(resolvable: string, options: ResolverOptions): Promise<ResolverResult> {
    if (!this.ensurePathExists(resolvable)) {
      throw ResolutionError.localDirectoryNotFound(resolvable);
    }

    if (options.path) {
      resolvable = path.join(resolvable, options.path);

      if (!this.ensurePathExists(resolvable)) {
        throw ResolutionError.localSubdirectoryNotFound(options.path);
      }
    }

    return {
      path: resolvable,
      temporary: false,
    };
  }

  /**
   * Checks if the given path is a valid directory.
   */
  protected ensurePathExists(path: string): boolean {
    return fs.pathExistsSync(path) && fs.statSync(path).isDirectory();
  }
}
