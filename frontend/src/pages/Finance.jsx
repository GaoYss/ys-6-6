import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { MetricCard } from '../components/MetricCard.jsx'

export function Finance({ profitReport, summary }) {
  const [expanded, setExpanded] = useState({})
  const totalProfit = profitReport.reduce((sum, item) => sum + item.gross_profit, 0)
  const totalRevenue = profitReport.reduce((sum, item) => sum + item.sale_price, 0)
  const totalCost = profitReport.reduce((sum, item) => sum + item.cost, 0)
  const totalIngredientCost = profitReport.reduce((sum, item) => sum + item.ingredient_cost, 0)
  const totalPackagingCost = profitReport.reduce((sum, item) => sum + item.packaging_cost, 0)

  const toggle = (key) => setExpanded((current) => ({ ...current, [key]: !current[key] }))

  return (
    <div className="page-grid">
      <section className="metrics">
        <MetricCard label="规格销售额" value={`¥${totalRevenue.toFixed(1)}`} helper="按当前规格售价汇总" />
        <MetricCard label="原料成本" value={`¥${totalIngredientCost.toFixed(1)}`} helper="配方原料自动汇总" />
        <MetricCard label="毛利合计" value={`¥${totalProfit.toFixed(1)}`} helper="售价减配方成本" />
        <MetricCard label="平均毛利率" value={`${Math.round((summary?.average_margin ?? 0) * 100)}%`} helper="全规格平均" />
      </section>

      <section className="panel">
        <div className="section-title">
          <h2>成本利润核算</h2>
          <span>{profitReport.length} 条</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th></th>
                <th>菜品</th>
                <th>规格</th>
                <th>售价</th>
                <th>原料成本</th>
                <th>包装成本</th>
                <th>毛利</th>
                <th>毛利率</th>
              </tr>
            </thead>
            <tbody>
              {profitReport.map((line) => {
                const key = `${line.dish_id}-${line.spec_name}`
                const isOpen = expanded[key]
                return (
                  <>
                    <tr key={key}>
                      <td>
                        {(line.recipe_items || []).length > 0 && (
                          <button className="icon-only expand-btn" type="button" onClick={() => toggle(key)} title="查看配方明细">
                            {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        )}
                      </td>
                      <td><strong>{line.dish_name}</strong></td>
                      <td>{line.spec_name}</td>
                      <td>¥{line.sale_price}</td>
                      <td>¥{line.ingredient_cost.toFixed(2)}</td>
                      <td>¥{line.packaging_cost.toFixed(2)}</td>
                      <td>¥{line.gross_profit}</td>
                      <td>
                        <div className="margin-cell">
                          <span style={{ width: `${Math.round(line.gross_margin * 100)}%` }} />
                          <b>{Math.round(line.gross_margin * 100)}%</b>
                        </div>
                      </td>
                    </tr>
                    {isOpen && (line.recipe_items || []).length > 0 && (
                      <tr key={`${key}-recipe`} className="recipe-detail-row">
                        <td></td>
                        <td colSpan="7">
                          <div className="finance-recipe-detail">
                            <table className="recipe-table">
                              <thead>
                                <tr>
                                  <th>原料</th>
                                  <th>用量</th>
                                  <th>单价</th>
                                  <th>小计</th>
                                </tr>
                              </thead>
                              <tbody>
                                {line.recipe_items.map((ri) => (
                                  <tr key={ri.ingredient_id}>
                                    <td>{ri.ingredient_name}</td>
                                    <td>{ri.qty}{ri.unit}</td>
                                    <td>¥{ri.unit_price}/{ri.unit}</td>
                                    <td>¥{ri.subtotal}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
            <tfoot>
              <tr>
                <td></td>
                <td><strong>合计</strong></td>
                <td></td>
                <td>¥{totalRevenue.toFixed(1)}</td>
                <td>¥{totalIngredientCost.toFixed(1)}</td>
                <td>¥{totalPackagingCost.toFixed(1)}</td>
                <td>¥{totalProfit.toFixed(1)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  )
}
