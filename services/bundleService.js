'use strict';

const { Products, CuratedBundles, Sequelize } = require('../models');
const { Op } = Sequelize;

const extractProductIds = (bundle) => {
  if (!bundle || !Array.isArray(bundle.products)) return [];
  return bundle.products
    .map(p => (typeof p === 'string' ? p : p && p.id))
    .filter(Boolean);
};

const bundleService = {
  /**
   * Resolve a bundle's products into available vs unavailable.
   * Pricing is admin-managed and not adjusted here.
   */
  async resolveBundleContents(bundle) {
    const productIds = extractProductIds(bundle);
    if (productIds.length === 0) {
      return { available: [], unavailable: [], fulfillable: false };
    }

    const products = await Products.findAll({
      where: { sku: { [Op.in]: productIds } }
    });

    const available = products.filter(p => p.is_available);
    const unavailable = products.filter(p => !p.is_available);

    return {
      available,
      unavailable,
      fulfillable: available.length > 0
    };
  },

  /**
   * Resolve a bundle by its bundle_id. Returns null if the bundle is missing.
   */
  async resolveByBundleId(bundleId) {
    const bundle = await CuratedBundles.findOne({ where: { bundle_id: bundleId } });
    if (!bundle) return null;

    const contents = await this.resolveBundleContents(bundle);
    return { bundle, ...contents };
  }
};

module.exports = bundleService;
