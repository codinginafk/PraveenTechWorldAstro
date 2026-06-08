export function scoreCluster(cluster, memory) {
  const key = cluster.clusterKey;
  const mem = memory[key] || { velocity: 0, firstSeen: new Date().toISOString() };
  const now = Date.now();
  const hoursSinceFirstSeen = (now - new Date(mem.firstSeen).getTime()) / 3600000;

  const velocityScore = Math.min((mem.velocity || 0) / 10, 1) * 2;
  const diversityScore = Math.min((cluster.sourceDiversity || 1) / 4, 1) * 2;
  const gapBonus = (mem.gapScore || 0) * 3;
  const freshnessScore = hoursSinceFirstSeen < 48 ? 1 : 0.5;

  const total = velocityScore + diversityScore + gapBonus + freshnessScore;

  return {
    total: Math.round(total * 10) / 10,
    maxScore: 10,
    components: { velocityScore, diversityScore, gapBonus, freshnessScore },
  };
}
