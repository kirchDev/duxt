export interface Advisory {
  github_advisory_id: string;
  module_name: string;
  severity: string;
  findings: { version: string; paths: string[] }[];
}
export interface AdvisoryReview {
  id: string;
  package: string;
  severity: string;
  reviewBy: string;
  reachability: string;
  remediation: string;
  findings: { version: string; paths: string[] }[];
}

/** A review applies only to its exact dependency paths, versions and severity. */
export function unreviewedAdvisories(
  advisories: Advisory[],
  reviews: AdvisoryReview[],
  today: string
) {
  return advisories.flatMap((advisory) => {
    const review = reviews.find(
      (entry) =>
        entry.id === advisory.github_advisory_id &&
        entry.package === advisory.module_name
    );
    if (!review)
      return [
        `${advisory.github_advisory_id}: unreviewed ${advisory.module_name}`
      ];
    if (review.reviewBy <= today)
      return [`${review.id}: review expired on ${review.reviewBy}`];
    if (
      !review.reachability ||
      !review.remediation ||
      review.severity !== advisory.severity
    )
      return [`${review.id}: incomplete review or changed severity`];
    const known = new Set(
      review.findings.flatMap((finding) =>
        finding.paths.map((path) => `${finding.version}:${path}`)
      )
    );
    return advisory.findings.flatMap((finding) =>
      finding.paths
        .filter((path) => !known.has(`${finding.version}:${path}`))
        .map(
          (path) =>
            `${review.id}: unreviewed dependency path ${finding.version}:${path}`
        )
    );
  });
}
