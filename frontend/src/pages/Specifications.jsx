import { useState } from 'react'
import { Plus, Save, Trash2, X, Loader2 } from 'lucide-react'
import { api } from '../api/client.js'
import { EmptyState } from '../components/EmptyState.jsx'

const initialForm = {
  dish_id: '',
  name: '标准份',
  serving_size: '',
  sale_price: '',
  packaging_cost: '',
}

export function Specifications({ dishes, specifications, ingredients, refresh }) {
  const [form, setForm] = useState(initialForm)
  const [recipeForm, setRecipeForm] = useState({})
  const [expandedSpec, setExpandedSpec] = useState(null)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [addingIngredient, setAddingIngredient] = useState(null)
  const [removingIngredient, setRemovingIngredient] = useState(null)
  const [recipeErrors, setRecipeErrors] = useState({})

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }))

  const submit = async (event) => {
    event.preventDefault()
    setCreating(true)
    setCreateError('')
    try {
      await api.createSpecification({
        ...form,
        sale_price: Number(form.sale_price),
        packaging_cost: Number(form.packaging_cost),
        recipe_items: [],
      })
      setForm(initialForm)
      refresh()
    } catch (error) {
      setCreateError(error.message || '创建失败')
    } finally {
      setCreating(false)
    }
  }

  const remove = async (spec) => {
    if (!confirm(`确定删除规格「${spec.name}」吗？`)) return
    await api.deleteSpecification(spec.id)
    refresh()
  }

  const addIngredient = async (specId) => {
    const rf = recipeForm[specId]
    if (!rf?.ingredient_id || !rf?.qty) {
      setRecipeErrors((current) => ({ ...current, [specId]: '请选择原料并填写用量' }))
      return
    }
    setAddingIngredient(specId)
    setRecipeErrors((current) => ({ ...current, [specId]: '' }))
    try {
      await api.addRecipeItem(specId, {
        ingredient_id: rf.ingredient_id,
        qty: Number(rf.qty),
      })
      setRecipeForm((current) => ({ ...current, [specId]: {} }))
      refresh()
    } catch (error) {
      setRecipeErrors((current) => ({ ...current, [specId]: error.message || '添加失败' }))
    } finally {
      setAddingIngredient(null)
    }
  }

  const removeIngredient = async (specId, ingredientId, ingredientName) => {
    if (!confirm(`确定从配方中移除「${ingredientName}」吗？`)) return
    setRemovingIngredient(`${specId}-${ingredientId}`)
    setRecipeErrors((current) => ({ ...current, [specId]: '' }))
    try {
      await api.removeRecipeItem(specId, ingredientId)
      refresh()
    } catch (error) {
      setRecipeErrors((current) => ({ ...current, [specId]: error.message || '移除失败' }))
    } finally {
      setRemovingIngredient(null)
    }
  }

  const updateRecipeForm = (specId, field, value) => {
    setRecipeForm((current) => ({
      ...current,
      [specId]: { ...current[specId], [field]: value },
    }))
    if (recipeErrors[specId]) {
      setRecipeErrors((current) => ({ ...current, [specId]: '' }))
    }
  }

  const dishName = (id) => dishes.find((dish) => dish.id === id)?.name || '未知菜品'

  const usedIngredientIds = (spec) =>
    new Set((spec.recipe_items || []).map((ri) => ri.ingredient_id))

  return (
    <div className="two-column">
      <section className="panel">
        <div className="section-title">
          <h2>规格与配方</h2>
          <span>{specifications.length} 个规格</span>
        </div>
        {specifications.length === 0 ? (
          <EmptyState text="还没有规格" />
        ) : (
          <div className="spec-recipe-list">
            {specifications.map((spec) => (
              <article className="spec-recipe-card" key={spec.id}>
                <div className="spec-recipe-header" onClick={() => setExpandedSpec(expandedSpec === spec.id ? null : spec.id)}>
                  <div>
                    <span className="spec-dish-tag">{dishName(spec.dish_id)}</span>
                    <h3>{spec.name}</h3>
                  </div>
                  <div className="spec-metrics">
                    <div className="spec-metric">
                      <small>售价</small>
                      <b>¥{spec.sale_price}</b>
                    </div>
                    <div className="spec-metric">
                      <small>原料成本</small>
                      <b>¥{spec.ingredient_cost.toFixed(1)}</b>
                    </div>
                    <div className="spec-metric">
                      <small>总成本</small>
                      <b>¥{(spec.ingredient_cost + spec.packaging_cost).toFixed(1)}</b>
                    </div>
                    <div className="spec-metric highlight">
                      <small>毛利率</small>
                      <b>{Math.round(spec.gross_margin * 100)}%</b>
                    </div>
                  </div>
                  <button className="danger icon-only" onClick={(e) => { e.stopPropagation(); remove(spec) }} type="button" title="删除规格">
                    <Trash2 size={15} />
                  </button>
                </div>

                {expandedSpec === spec.id && (
                  <div className="spec-recipe-body">
                    <div className="recipe-items-section">
                      <h4>配方原料</h4>
                      {(spec.recipe_items || []).length === 0 ? (
                        <p className="recipe-empty">尚未绑定原料，请在下方添加</p>
                      ) : (
                        <table className="recipe-table">
                          <thead>
                            <tr>
                              <th>原料</th>
                              <th>用量</th>
                              <th>单价</th>
                              <th>小计</th>
                              <th></th>
                            </tr>
                          </thead>
                          <tbody>
                            {(spec.recipe_items || []).map((ri) => (
                              <tr key={ri.ingredient_id}>
                                <td><strong>{ri.ingredient_name}</strong></td>
                                <td>{ri.qty}{ri.unit}</td>
                                <td>¥{ri.unit_price}/{ri.unit}</td>
                                <td>¥{ri.subtotal}</td>
                                <td>
                                  <button
                                    className="danger icon-only"
                                    type="button"
                                    onClick={() => removeIngredient(spec.id, ri.ingredient_id, ri.ingredient_name)}
                                    title="移除原料"
                                    disabled={removingIngredient === `${spec.id}-${ri.ingredient_id}`}
                                  >
                                    {removingIngredient === `${spec.id}-${ri.ingredient_id}` ? (
                                      <Loader2 size={14} className="spin" />
                                    ) : (
                                      <X size={14} />
                                    )}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr>
                              <td colSpan="3"><strong>原料成本合计</strong></td>
                              <td><strong>¥{spec.ingredient_cost.toFixed(2)}</strong></td>
                              <td></td>
                            </tr>
                          </tfoot>
                        </table>
                      )}

                      {recipeErrors[spec.id] && (
                        <p className="recipe-error">{recipeErrors[spec.id]}</p>
                      )}

                      <div className="recipe-add-row">
                        <select
                          value={recipeForm[spec.id]?.ingredient_id || ''}
                          onChange={(e) => updateRecipeForm(spec.id, 'ingredient_id', e.target.value)}
                          disabled={addingIngredient === spec.id}
                        >
                          <option value="">选择原料</option>
                          {ingredients
                            .filter((ing) => !usedIngredientIds(spec).has(ing.id))
                            .map((ing) => (
                              <option key={ing.id} value={ing.id}>{ing.name} (¥{ing.avg_price}/{ing.unit})</option>
                            ))}
                        </select>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="用量"
                          value={recipeForm[spec.id]?.qty || ''}
                          onChange={(e) => updateRecipeForm(spec.id, 'qty', e.target.value)}
                          disabled={addingIngredient === spec.id}
                        />
                        <button
                          className="primary compact"
                          type="button"
                          onClick={() => addIngredient(spec.id)}
                          disabled={addingIngredient === spec.id}
                        >
                          {addingIngredient === spec.id ? (
                            <Loader2 size={14} className="spin" />
                          ) : (
                            <Plus size={14} />
                          )}
                          <span>{addingIngredient === spec.id ? '添加中' : '添加'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="panel side-panel">
        <div className="section-title">
          <h2>新增规格</h2>
          <Plus size={18} />
        </div>
        <form className="form" onSubmit={submit}>
          {createError && (
            <p className="form-error">{createError}</p>
          )}
          <label>
            关联菜品
            <select value={form.dish_id} onChange={(event) => updateField('dish_id', event.target.value)} required disabled={creating}>
              <option value="">选择菜品</option>
              {dishes.map((dish) => (
                <option key={dish.id} value={dish.id}>{dish.name}</option>
              ))}
            </select>
          </label>
          <label>
            规格名称
            <input value={form.name} onChange={(event) => updateField('name', event.target.value)} required disabled={creating} />
          </label>
          <label>
            出品量
            <input value={form.serving_size} onChange={(event) => updateField('serving_size', event.target.value)} placeholder="例如 250g" required disabled={creating} />
          </label>
          <div className="form-grid">
            <label>
              售价
              <input type="number" min="0" step="0.1" value={form.sale_price} onChange={(event) => updateField('sale_price', event.target.value)} required disabled={creating} />
            </label>
            <label>
              包装/损耗成本
              <input type="number" min="0" step="0.1" value={form.packaging_cost} onChange={(event) => updateField('packaging_cost', event.target.value)} required disabled={creating} />
            </label>
          </div>
          <p className="form-hint">原料配方请在创建后展开规格卡片添加</p>
          <button className="primary" type="submit" disabled={creating}>
            {creating ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
            <span>{creating ? '保存中...' : '保存规格'}</span>
          </button>
        </form>
      </section>
    </div>
  )
}
