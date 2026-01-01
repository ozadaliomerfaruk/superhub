import { RecurringTemplate } from '../../types';
import { recurringTemplateRepository, expenseRepository } from '../database';
import { addDays, addWeeks, addMonths, addYears, startOfDay, format, isBefore, isAfter, parseISO } from 'date-fns';

interface RecurringCheckResult {
  templatesChecked: number;
  expensesCreated: number;
  errors: string[];
}

// Calculate the next due date based on frequency
function getNextDueDate(frequency: RecurringTemplate['frequency'], dayOfMonth?: number): Date {
  const today = startOfDay(new Date());
  let dueDate: Date;

  switch (frequency) {
    case 'weekly':
      // Due every week, starting from today
      dueDate = today;
      break;
    case 'biweekly':
      // Due every 2 weeks
      dueDate = today;
      break;
    case 'monthly':
      // Due on specified day of month, or 1st if not specified
      const day = dayOfMonth || 1;
      dueDate = new Date(today.getFullYear(), today.getMonth(), day);
      if (isBefore(dueDate, today)) {
        dueDate = addMonths(dueDate, 1);
      }
      break;
    case 'quarterly':
      // Due on specified day, every 3 months
      const qDay = dayOfMonth || 1;
      dueDate = new Date(today.getFullYear(), today.getMonth(), qDay);
      if (isBefore(dueDate, today)) {
        dueDate = addMonths(dueDate, 1);
      }
      break;
    case 'yearly':
      // Due once a year
      const yDay = dayOfMonth || 1;
      dueDate = new Date(today.getFullYear(), 0, yDay);
      if (isBefore(dueDate, today)) {
        dueDate = addYears(dueDate, 1);
      }
      break;
    default:
      dueDate = today;
  }

  return dueDate;
}

// Check if a recurring expense should be created today
function shouldCreateExpense(
  template: RecurringTemplate,
  lastCreatedDate?: string
): boolean {
  const today = startOfDay(new Date());
  const todayNum = today.getDate();

  // If we have a last created date, check if enough time has passed
  if (lastCreatedDate) {
    const lastDate = parseISO(lastCreatedDate);

    switch (template.frequency) {
      case 'weekly':
        const weekLater = addWeeks(lastDate, 1);
        return !isAfter(weekLater, today);
      case 'biweekly':
        const biweekLater = addWeeks(lastDate, 2);
        return !isAfter(biweekLater, today);
      case 'monthly':
        const monthLater = addMonths(lastDate, 1);
        return !isAfter(monthLater, today);
      case 'quarterly':
        const quarterLater = addMonths(lastDate, 3);
        return !isAfter(quarterLater, today);
      case 'yearly':
        const yearLater = addYears(lastDate, 1);
        return !isAfter(yearLater, today);
    }
  }

  // No previous expense - check if today matches the schedule
  // typicalPaymentDay is now a string like "15th", "1st", etc.
  // We don't auto-create expenses based on this anymore - payments are tracked manually
  // So we only auto-create for weekly/biweekly templates

  // For weekly/biweekly without specific day, create if no previous
  return ['weekly', 'biweekly'].includes(template.frequency);
}

export const recurringExpenseService = {
  // Check and create any due recurring expenses
  async processRecurringExpenses(): Promise<RecurringCheckResult> {
    const result: RecurringCheckResult = {
      templatesChecked: 0,
      expensesCreated: 0,
      errors: [],
    };

    try {
      // Get all active templates from all properties
      const allTemplates = await this.getAllActiveTemplates();
      result.templatesChecked = allTemplates.length;

      for (const template of allTemplates) {
        try {
          // Get the most recent expense for this template
          const lastExpense = await this.getLastExpenseForTemplate(template.id);
          const lastCreatedDate = lastExpense?.created_at;

          if (shouldCreateExpense(template, lastCreatedDate)) {
            await this.createExpenseFromTemplate(template);
            result.expensesCreated++;
          }
        } catch (error) {
          result.errors.push(`Failed to process template ${template.name}: ${error}`);
        }
      }
    } catch (error) {
      result.errors.push(`Failed to get templates: ${error}`);
    }

    return result;
  },

  // Get all active templates across all properties
  async getAllActiveTemplates(): Promise<RecurringTemplate[]> {
    // We need to query all active templates
    const { queryAll } = await import('../database/database');
    const rows = await queryAll<any>(
      'SELECT * FROM recurring_templates WHERE is_active = 1'
    );
    return rows.map((row: any) => ({
      id: row.id,
      propertyId: row.property_id,
      name: row.name,
      category: row.category,
      estimatedAmount: row.estimated_amount || undefined,
      frequency: row.frequency as RecurringTemplate['frequency'],
      typicalPaymentDay: row.typical_payment_day || undefined,
      isActive: row.is_active === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  },

  // Get the last expense created from a template
  async getLastExpenseForTemplate(templateId: string) {
    const { queryFirst } = await import('../database/database');
    return queryFirst<any>(
      `SELECT * FROM expenses
       WHERE recurring_template_id = ?
       ORDER BY created_at DESC
       LIMIT 1`,
      [templateId]
    );
  },

  // Create an expense from a template
  async createExpenseFromTemplate(template: RecurringTemplate): Promise<void> {
    // Skip auto-creation if no estimated amount is set
    // This prevents creating $0 expenses which could confuse users
    if (template.estimatedAmount === undefined || template.estimatedAmount === null) {
      return;
    }

    await expenseRepository.create({
      propertyId: template.propertyId,
      type: 'bill',
      category: template.category,
      amount: template.estimatedAmount,
      date: new Date().toISOString(),
      description: `${template.name} (Auto-generated)`,
      isRecurring: true,
      recurringTemplateId: template.id,
    });
  },

  // Get templates that are due today
  async getTemplatesDueToday(): Promise<RecurringTemplate[]> {
    const allTemplates = await this.getAllActiveTemplates();
    const dueTemplates: RecurringTemplate[] = [];

    for (const template of allTemplates) {
      const lastExpense = await this.getLastExpenseForTemplate(template.id);
      if (shouldCreateExpense(template, lastExpense?.created_at)) {
        dueTemplates.push(template);
      }
    }

    return dueTemplates;
  },
};
