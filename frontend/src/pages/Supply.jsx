import { useMemo, useState } from 'react'
import { CheckCircle2, PackagePlus, Pencil, X, Save, Loader2, AlertCircle } from 'lucide-react'
import { api } from '../api/client.js'
import { StatusBadge } from '../components/StatusBadge.jsx'

export function Supply({ ingredients, suppliers, purchaseOrders, refresh }) {
  const [form, setForm] = useState({
    supplier_id: '',
    ingredient_id: '',
    qty: '',
    unit_price: '',
    expected_arrival: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    remark: '',
  })
  const [editingPrice, setEditingPrice] = useState(null)
  const [priceValue, setPriceValue] = useState('')
  const [savingPrice, setSavingPrice] = useState(false)
  const [priceError, setPriceError] = useState('')
  const [receiveLoading, setReceiveLoading] = useState(null)
  const [receiveErrors, setReceiveErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const selectedIngredient = useMemo(
    () => ingredients.find((item) => item.id === form.ingredient_id),
    [ingredients, form.ingredient_id],
  )

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }))

  const submit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setSubmitError('')
    try {
      await api.createPurchaseOrder({
        supplier_id: form.supplier_id,
        expected_arrival: form.expected_arrival,
        remark: form.remark,
        items: [{
          ingredient_id: form.ingredient_id,
          qty: Number(form.qty),
          unit_price: Number(form.unit_price),
        }],
      })
      setForm((current) => ({ ...current, ingredient_id: '', qty: '', unit_price: '', remark: '' }))
      refresh()
    } catch (error) {
      setSubmitError(error.message || '提交失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  const receive = async (order) => {
    setReceiveLoading(order.id)
    setReceiveErrors((current) => ({ ...current, [order.id]: '' }))
    try {
      await api.updatePurchaseStatus(order.id, 'received')
      refresh()
    } catch (error) {
      setReceiveErrors((current) => ({ ...current, [order.id]: error.message || '入库失败' }))
    } finally {
      setReceiveLoading(null)
    }
  }

  const startEditPrice = (item) => {
    setEditingPrice(item.id)
    setPriceValue(String(item.avg_price))
    setPriceError('')
  }

  const cancelEditPrice = () => {
    setEditingPrice(null)
    setPriceValue('')
    setPriceError('')
  }

  const savePrice = async (ingredientId) => {
    const price = Number(priceValue)
    if (!price || price <= 0) {
      setPriceError('请输入大于 0 的价格')
      return
    }
    setSavingPrice(true)
    setPriceError('')
    try {
      await api.updateIngredientPrice(ingredientId, price)
      setEditingPrice(null)
      setPriceValue('')
      refresh()
    } catch (error) {
      setPriceError(error.message || '保存失败')
    } finally {
      setSavingPrice(false)
    }
  }

  return (
    <div className="page-grid">
      <section className="panel">
        <div className="section-title">
          <h2>原料库存</h2>
          <span>{ingredients.length} 项</span>
        </div>
        <p className="table-hint">点击均价列可直接修改价格，修改后相关规格成本与利润报表自动刷新</p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>原料</th>
                <th>分类</th>
                <th>库存</th>
                <th>安全库存</th>
                <th>均价</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {ingredients.map((item) => (
                <tr key={item.id} className={item.stock_qty <= item.safety_stock ? 'warning-row' : ''}>
                  <td><strong>{item.name}</strong></td>
                  <td>{item.category}</td>
                  <td>{item.stock_qty}{item.unit}</td>
                  <td>{item.safety_stock}{item.unit}</td>
                  <td>
                    {editingPrice === item.id ? (
                      <div className="price-edit-row">
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={priceValue}
                          onChange={(e) => setPriceValue(e.target.value)}
                          autoFocus
                          className="price-input"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') savePrice(item.id)
                            if (e.key === 'Escape') cancelEditPrice()
                          }}
                        />
                        <span className="price-unit">¥/{item.unit}</span>
                      </div>
                    ) : (
                      <span className="price-display">¥{item.avg_price}</span>
                    )}
                    {editingPrice === item.id && priceError && (
                      <p className="price-error">{priceError}</p>
                    )}
                  </td>
                  <td className="row-actions">
                    {editingPrice === item.id ? (
                      <>
                        <button
                          className="primary compact-icon"
                          type="button"
                          onClick={() => savePrice(item.id)}
                          disabled={savingPrice}
                          title="保存"
                        >
                          {savingPrice ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
                        </button>
                        <button
                          className="icon-only"
                          type="button"
                          onClick={cancelEditPrice}
                          disabled={savingPrice}
                          title="取消"
                        >
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <button
                        className="icon-only"
                        type="button"
                        onClick={() => startEditPrice(item)}
                        title="修改价格"
                      >
                        <Pencil size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="two-column compact">
        <section className="panel">
          <div className="section-title">
            <h2>采购单</h2>
            <span>{purchaseOrders.length} 单</span>
          </div>
          <div className="list">
            {purchaseOrders.map((order) => (
              <div className="order-row" key={order.id}>
                <div>
                  <strong>{order.id}</strong>
                  <span>{suppliers.find((item) => item.id === order.supplier_id)?.name} · 到货 {order.expected_arrival}</span>
                  <small>{order.remark || '无备注'}</small>
                  {receiveErrors[order.id] && (
                    <p className="order-error">
                      <AlertCircle size={13} />
                      <span>{receiveErrors[order.id]}</span>
                    </p>
                  )}
                </div>
                <div className="order-side">
                  <b>¥{order.total_amount}</b>
                  <StatusBadge value={order.status} />
                  {order.status !== 'received' && (
                    <button
                      type="button"
                      onClick={() => receive(order)}
                      disabled={receiveLoading === order.id}
                    >
                      {receiveLoading === order.id ? <Loader2 size={15} className="spin" /> : <CheckCircle2 size={15} />}
                      {receiveLoading === order.id ? '入库中' : '入库'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="panel side-panel">
          <div className="section-title">
            <h2>新建采购</h2>
            <PackagePlus size={18} />
          </div>
          <form className="form" onSubmit={submit}>
            {submitError && (
              <p className="form-error">
                <AlertCircle size={14} />
                <span>{submitError}</span>
              </p>
            )}
            <label>
              供应商
              <select value={form.supplier_id} onChange={(event) => updateField('supplier_id', event.target.value)} required disabled={submitting}>
                <option value="">选择供应商</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                ))}
              </select>
            </label>
            <label>
              原料
              <select value={form.ingredient_id} onChange={(event) => updateField('ingredient_id', event.target.value)} required disabled={submitting}>
                <option value="">选择原料</option>
                {ingredients.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </label>
            <div className="form-grid">
              <label>
                数量{selectedIngredient ? `(${selectedIngredient.unit})` : ''}
                <input type="number" min="0" step="0.1" value={form.qty} onChange={(event) => updateField('qty', event.target.value)} required disabled={submitting} />
              </label>
              <label>
                单价
                <input type="number" min="0" step="0.1" value={form.unit_price} onChange={(event) => updateField('unit_price', event.target.value)} required disabled={submitting} />
              </label>
            </div>
            <label>
              预计到货
              <input type="date" value={form.expected_arrival} onChange={(event) => updateField('expected_arrival', event.target.value)} required disabled={submitting} />
            </label>
            <label>
              备注
              <textarea rows="3" value={form.remark} onChange={(event) => updateField('remark', event.target.value)} disabled={submitting} />
            </label>
            <button className="primary" type="submit" disabled={submitting}>
              {submitting ? <Loader2 size={16} className="spin" /> : <PackagePlus size={16} />}
              <span>{submitting ? '提交中...' : '提交采购'}</span>
            </button>
          </form>
        </section>
      </div>
    </div>
  )
}
