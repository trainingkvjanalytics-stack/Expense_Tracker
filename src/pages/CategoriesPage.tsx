import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus,
  Trash2,
  Edit2,
  Lock,
  Check,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCategories } from '@/hooks/useCategories';
import type { Category } from '@/types/database';

const COLOR_PALETTE = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#64748b', // Slate
];

const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  type: z.enum(['income', 'expense', 'investment']),
  color: z.string().min(1, 'Please pick a color'),
  icon: z.string().optional().nullable(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

export const CategoriesPage: React.FC = () => {
  const {
    categories,
    subcategories,
    createCategory,
    updateCategory,
    deleteCategory,
    createSubcategory,
    deleteSubcategory,
  } = useCategories();

  // Modals state
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);

  const [subModalOpen, setSubModalOpen] = useState(false);
  const [parentCatForSub, setParentCatForSub] = useState<Category | null>(null);
  const [subName, setSubName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Category Form
  const {
    register: registerCat,
    handleSubmit: handleSubmitCat,
    control: controlCat,
    reset: resetCat,
    setValue: setCatValue,
    watch: watchCat,
    formState: { errors: errorsCat },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      type: 'expense',
      color: '#3b82f6',
      icon: 'tag',
    },
  });

  const selectedColor = watchCat('color');

  const openAddCategory = (defaultType: 'income' | 'expense' = 'expense') => {
    setEditingCat(null);
    resetCat({
      name: '',
      type: defaultType,
      color: defaultType === 'income' ? '#10b981' : '#ef4444',
      icon: 'tag',
    });
    setCatModalOpen(true);
  };

  const openEditCategory = (cat: Category) => {
    setEditingCat(cat);
    resetCat({
      name: cat.name,
      type: cat.type,
      color: cat.color || '#3b82f6',
      icon: cat.icon || 'tag',
    });
    setCatModalOpen(true);
  };

  const onCategorySubmit = async (values: CategoryFormValues) => {
    setIsSubmitting(true);
    try {
      if (editingCat) {
        const ok = await updateCategory(editingCat.id, {
          name: values.name,
          type: values.type,
          color: values.color,
          icon: values.icon || null,
        });
        if (ok) setCatModalOpen(false);
      } else {
        const ok = await createCategory({
          name: values.name,
          type: values.type,
          color: values.color,
          icon: values.icon || null,
        });
        if (ok) setCatModalOpen(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const onAddSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentCatForSub || !subName.trim()) return;

    setIsSubmitting(true);
    try {
      const ok = await createSubcategory({
        category_id: parentCatForSub.id,
        name: subName.trim(),
      });
      if (ok) {
        setSubModalOpen(false);
        setSubName('');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const incomeCategories = categories.filter((c) => c.type === 'income');

  const renderCategoryList = (list: Category[]) => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((cat) => {
          const catSubs = subcategories.filter((s) => s.category_id === cat.id);

          return (
            <Card key={cat.id} className="p-4 flex flex-col justify-between shadow-xs border-border/80">
              <div>
                {/* Header */}
                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="h-3.5 w-3.5 shrink-0 rounded-full shadow-xs"
                      style={{ backgroundColor: cat.color || '#3b82f6' }}
                    />
                    <h3 className="font-bold text-sm text-foreground truncate">{cat.name}</h3>
                  </div>
                  {cat.is_system ? (
                    <Badge variant="secondary" className="text-[10px] gap-1 shrink-0">
                      <Lock className="h-2.5 w-2.5" />
                      Default
                    </Badge>
                  ) : (
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => openEditCategory(cat)}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:bg-destructive/10"
                        onClick={() => deleteCategory(cat.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Subcategories */}
                <div className="py-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Subcategories ({catSubs.length})
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[11px] text-primary gap-1 px-1.5"
                      onClick={() => {
                        setParentCatForSub(cat);
                        setSubName('');
                        setSubModalOpen(true);
                      }}
                    >
                      <Plus className="h-3 w-3" />
                      Add Sub
                    </Button>
                  </div>

                  {catSubs.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic py-1">
                      No subcategories configured yet.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {catSubs.map((sub) => (
                        <span
                          key={sub.id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-xs font-medium text-foreground group"
                        >
                          {sub.name}
                          <button
                            type="button"
                            onClick={() => deleteSubcategory(sub.id)}
                            className="text-muted-foreground/60 hover:text-destructive transition-colors ml-0.5"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Categories & Subcategories</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Manage your custom spending buckets, colors, and hierarchical tags
          </p>
        </div>
        <Button onClick={() => openAddCategory('expense')} className="gap-1.5 shadow-xs self-start sm:self-auto">
          <Plus className="h-4 w-4" />
          Add Category
        </Button>
      </div>

      {/* Tabs: Expense vs Income */}
      <Tabs defaultValue="expenses" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 max-w-xs">
          <TabsTrigger value="expenses">
            Expenses ({expenseCategories.length})
          </TabsTrigger>
          <TabsTrigger value="income">
            Income ({incomeCategories.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="expenses">
          {renderCategoryList(expenseCategories)}
        </TabsContent>

        <TabsContent value="income">
          {renderCategoryList(incomeCategories)}
        </TabsContent>
      </Tabs>

      {/* MODAL 1: Add/Edit Category */}
      <Dialog open={catModalOpen} onOpenChange={setCatModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCat ? 'Edit Category' : 'Create Custom Category'}</DialogTitle>
            <DialogDescription>
              Assign a distinct color and type for clean chart visualization
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitCat(onCategorySubmit)} className="space-y-4 pt-2">
            {/* Category Name */}
            <div className="space-y-1.5">
              <Label htmlFor="cat_name" className="text-xs font-semibold">
                Category Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="cat_name"
                placeholder="e.g. Pet Care, Software Subscriptions, Gym"
                className="h-10"
                {...registerCat('name')}
              />
              {errorsCat.name && <p className="text-xs text-destructive">{errorsCat.name.message}</p>}
            </div>

            {/* Transaction Type */}
            <div className="space-y-1.5">
              <Label htmlFor="cat_type" className="text-xs font-semibold">
                Classification Type
              </Label>
              <Controller
                control={controlCat}
                name="type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full h-10 text-xs">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expense">Expense (-)</SelectItem>
                      <SelectItem value="income">Income (+)</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Color Swatch Picker */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Category Color</Label>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {COLOR_PALETTE.map((color) => {
                  const isPicked = selectedColor === color;
                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setCatValue('color', color)}
                      className={`h-7 w-7 rounded-full transition-transform flex items-center justify-center ${
                        isPicked ? 'scale-110 ring-2 ring-primary ring-offset-2' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                    >
                      {isPicked && <Check className="h-3.5 w-3.5 text-white stroke-[3]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setCatModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : editingCat ? 'Update Category' : 'Save Category'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: Add Subcategory */}
      <Dialog open={subModalOpen} onOpenChange={setSubModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Subcategory</DialogTitle>
            <DialogDescription>
              Add a granular subcategory under <strong>{parentCatForSub?.name}</strong>
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={onAddSubcategory} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="sub_name" className="text-xs font-semibold">
                Subcategory Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="sub_name"
                value={subName}
                onChange={(e) => setSubName(e.target.value)}
                placeholder="e.g. Organic, Bakery, Uber, Swiggy"
                className="h-10"
                autoFocus
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setSubModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !subName.trim()}>
                {isSubmitting ? 'Adding...' : 'Add Subcategory'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CategoriesPage;
