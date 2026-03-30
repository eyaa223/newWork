import { useEffect, useMemo, useState } from "react";
import axios from "axios";

/**
 * Admin dashboard est sur PC => localhost ok.
 * Si tu veux l’utiliser depuis téléphone, remplace par http://192.168.1.27:5000
 */
const API_BASE = "http://localhost:5000";

const slugify = (s) =>
  String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "");

export default function AdminCategoriesPanel({ token }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  const [iconFile, setIconFile] = useState(null);

  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editLabel, setEditLabel] = useState("");
  const [editValue, setEditValue] = useState("");
  const [editIconFile, setEditIconFile] = useState(null);

  const authHeaders = useMemo(
    () => ({ Authorization: `Bearer ${token}` }),
    [token]
  );

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/admin/categories`, {
        headers: authHeaders,
      });
      setCategories(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error("fetchCategories:", e);
      setCategories([]);
      setMessage("❌ Impossible de charger les catégories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createCategory = async (e) => {
    e.preventDefault();
    setMessage("");

    const finalValue = value?.trim() ? value.trim() : slugify(label);
    if (!finalValue) {
      setMessage("❌ Value invalide");
      return;
    }

    try {
      setSaving(true);

      // 1) create category in DB
      const res = await axios.post(
        `${API_BASE}/admin/categories`,
        { value: finalValue, label },
        { headers: authHeaders }
      );

      const created = res.data;

      // 2) upload icon (optional)
      if (iconFile && created?.id) {
        const form = new FormData();
        form.append("icon", iconFile);

        await axios.post(`${API_BASE}/admin/categories/${created.id}/icon`, form, {
          headers: authHeaders,
        });
      }

      setLabel("");
      setValue("");
      setIconFile(null);

      // ✅ refresh list so it appears immediately
      await fetchCategories();

      setMessage("✅ Catégorie créée");
    } catch (e) {
      console.error("createCategory:", e);
      const serverMsg = e?.response?.data?.message;
      setMessage(serverMsg ? `❌ ${serverMsg}` : "❌ Erreur lors de la création");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (cat) => {
    setEditingId(cat.id);
    setEditLabel(cat.label || "");
    setEditValue(cat.value || "");
    setEditIconFile(null);
    setMessage("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditLabel("");
    setEditValue("");
    setEditIconFile(null);
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      setSaving(true);

      await axios.put(
        `${API_BASE}/admin/categories/${editingId}`,
        { value: editValue, label: editLabel },
        { headers: authHeaders }
      );

      if (editIconFile) {
        const form = new FormData();
        form.append("icon", editIconFile);

        await axios.post(`${API_BASE}/admin/categories/${editingId}/icon`, form, {
          headers: authHeaders,
        });
      }

      cancelEdit();
      await fetchCategories();
      setMessage("✅ Catégorie modifiée");
    } catch (e2) {
      console.error("saveEdit:", e2);
      const serverMsg = e2?.response?.data?.message;
      setMessage(serverMsg ? `❌ ${serverMsg}` : "❌ Erreur modification");
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = async (id) => {
    if (!window.confirm("Supprimer cette catégorie ?")) return;
    setMessage("");

    try {
      setSaving(true);
      await axios.delete(`${API_BASE}/admin/categories/${id}`, { headers: authHeaders });
      await fetchCategories();
      setMessage("✅ Catégorie supprimée");
    } catch (e) {
      console.error("deleteCategory:", e);
      const serverMsg = e?.response?.data?.message;
      setMessage(serverMsg ? `❌ ${serverMsg}` : "❌ Erreur suppression");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="categories-panel">
      <div className="admin-card__header">
        <div>
          <h2 className="admin-card__title">Catégories</h2>
          <p className="admin-card__desc">Créer / modifier / supprimer des catégories (label + image).</p>
        </div>
      </div>

      <form className="form" onSubmit={createCategory}>
        <div className="form__row">
          <label className="label">Label</label>
          <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} required />
        </div>

        <div className="form__row">
          <label className="label">Value (optionnel)</label>
          <input
            className="input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="ex: food"
          />
          <small style={{ opacity: 0.7 }}>
            Si vide: généré automatiquement depuis le label.
          </small>
        </div>

        <div className="form__row">
          <label className="label">Image</label>
          <input
            className="input"
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            onChange={(e) => setIconFile(e.target.files?.[0] || null)}
          />
        </div>

        <div className="form__actions">
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? "Enregistrement..." : "Ajouter"}
          </button>
         
        </div>

        {message && <div className="alert">{message}</div>}
      </form>

      <div style={{ height: 14 }} />

      {loading ? (
        <div className="admin-loading">Chargement...</div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Value</th>
                <th>Label</th>
                <th className="th-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => {
                const isEditing = editingId === c.id;

                if (isEditing) {
                  return (
                    <tr key={c.id}>
                      <td>
                        {c.icon ? (
                          <img
                            src={`${API_BASE}/upload/${c.icon}`}
                            alt=""
                            className="category-icon-img"
                          />
                        ) : "-"}
                      </td>

                      <td>
                        <input className="input" value={editValue} onChange={(e) => setEditValue(e.target.value)} />
                      </td>

                      <td>
                        <input className="input" value={editLabel} onChange={(e) => setEditLabel(e.target.value)} />
                        <div style={{ marginTop: 8 }}>
                          <input
                            className="input"
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/webp"
                            onChange={(e) => setEditIconFile(e.target.files?.[0] || null)}
                          />
                        </div>
                      </td>

                      <td className="td-center">
                        <div className="btn-group">
                          <button className="btn btn--success btn--sm" onClick={saveEdit} disabled={saving}>
                            Enregistrer
                          </button>
                          <button className="btn btn--ghost btn--sm" type="button" onClick={cancelEdit} disabled={saving}>
                            Annuler
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={c.id}>
                    <td>
                      {c.icon ? (
                        <img
                          src={`${API_BASE}/upload/${c.icon}`}
                          alt=""
                          className="category-icon-img"
                        />
                      ) : "-"}
                    </td>
                    <td>{c.value}</td>
                    <td>{c.label}</td>
                    <td className="td-center">
                      <div className="btn-group">
                        <button className="btn btn--primary btn--sm" onClick={() => startEdit(c)} disabled={saving}>
                          Modifier
                        </button>
                        <button className="btn btn--danger btn--sm" onClick={() => deleteCategory(c.id)} disabled={saving}>
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {categories.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", padding: 18, opacity: 0.8 }}>
                    Aucune catégorie
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}