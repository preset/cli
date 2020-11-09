import createInterface from 'cac';
import { inject, injectable } from 'inversify';
import { CommandLineInterfaceParameter, CommandLineInterfaceOption, OutputContract } from '@/Contracts/OutputContract';
import { ExecutionError } from '@/Errors';
import { getAbsolutePath, getPackage } from '@/utils';
import { Bus, bus, outputHelp, outputVersion } from '@/bus';
import { ApplierContract } from '@/Contracts/ApplierContract';
import { Binding } from '@/Container/Binding';

/**
 * Command line interface for applying a preset.
 */
@injectable()
export class CommandLineInterface {
  @inject(Binding.Output)
  protected output!: OutputContract;

  @inject(Binding.Applier)
  protected applier!: ApplierContract;

  @inject(Binding.Bus)
  protected bus!: Bus;

  protected parameters: CommandLineInterfaceParameter[] = [
    { name: 'resolvable', description: 'A GitHub repository URL or a local path.', optional: false },
    { name: 'target', description: 'The directory in which to apply the preset.', optional: true },
  ];

  protected options: CommandLineInterfaceOption[] = [
    { definition: '-p, --path [path]', description: 'The path to a sub-directory in which to look for a preset.' },
    { definition: '-h, --help', description: 'Display this help message.' },
    { definition: '-v', description: 'Define the verbosity level (eg. -vv).', type: [] },
    { definition: '--version', description: 'Display the version number.' },
  ];

  /**
   * Runs the CLI.
   */
  async run(argv: string[]): Promise<number> {
    const { args, options } = this.parse(argv);
    const [resolvable, target] = args;

    // Registers the output, which is event-based
    this.output.register(options.v?.length ?? 0);

    if (options.help) {
      bus.emit(outputHelp({ parameters: this.parameters, options: this.options }));
      return 0;
    }

    if (options.version) {
      bus.emit(outputVersion());
      return 0;
    }

    if (!resolvable) {
      this.bus.fatal('The resolvable is missing. Please consult the usage below.');
      bus.emit(outputHelp({ parameters: this.parameters, options: this.options }));
      return 1;
    }

    const code = await this.applier
      .run({
        resolvable,
        options,
        target: getAbsolutePath(target),
        args: [...args],
      })
      .then(() => 0)
      .catch((error) => {
        if (error instanceof ExecutionError) {
          this.bus.fatal(error);
        } else {
          this.bus.fatal(new ExecutionError(`An error occured while applying the preset.`).withCompleteStack(error).stopsExecution());
        }
        return 1;
      });

    return code;
  }

  /**
   * Parses the command line arguments.
   */
  parse(argv: string[]): ParsedArgv {
    const cli = createInterface(getPackage().name);
    this.options.forEach(({ definition, description, type }) => cli.option(definition, description, { type }));

    return cli.parse(process.argv.splice(0, 2).concat(argv));
  }
}

interface ParsedArgv {
  args: ReadonlyArray<string>;
  options: {
    [k: string]: any;
  };
}