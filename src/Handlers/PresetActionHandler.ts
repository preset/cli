import { injectable, inject } from 'inversify';
import { ActionHandlerContract, ContextContract, PresetActionContract, ApplierContract } from '@/Contracts';
import { contextualize } from '@/Handlers';
import { Logger } from '@/Logger';
import { Binding } from '@/Container';

@injectable()
export class PresetActionHandler implements ActionHandlerContract<'preset'> {
  for = 'preset' as const;

  @inject(Binding.Applier)
  protected applier!: ApplierContract;

  async validate(
    action: Partial<PresetActionContract>,
    context: ContextContract
  ): Promise<PresetActionContract | false> {
    action = contextualize(action, context);

    if (!action.preset) {
      return false;
    }

    if (action.arguments && !Array.isArray(action.arguments)) {
      action.arguments = [action.arguments];
    }

    action.inherit = Boolean(action.inherit);

    return {
      ...action,
      type: 'preset',
    } as PresetActionContract;
  }

  async handle(action: PresetActionContract, context: ContextContract) {
    try {
      if (!action.arguments) {
        action.arguments = [];
      }

      if (action.inherit) {
        (action.arguments as string[]).push(...context.argv);
      }

      return {
        success: true,
        tasks: await this.applier.run({
          resolvable: action.preset,
          argv: action.arguments as string[],
          in: context.targetDirectory,
          debug: context.debug,
        }),
      };
    } catch (error) {
      throw Logger.throw(`Preset ${action.preset ?? 'unnamed'} could not be applied.`, error);
    }
  }
}
