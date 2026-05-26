# Metrics

The North Star metric is **qualified monthly savings discovered**: total verified monthly savings from completed audits where the user also provides a valid email or books a consultation. This matches the product's job better than DAU because most companies should not use an AI spend audit every day. The value is in identifying real savings and creating a high-intent procurement conversation.

Three input metrics drive it. First, completed audits from the right audience: founders and engineering leaders at small teams with actual spend. Second, high-savings rate: the percentage of audits with more than $500/month in credible savings. Third, report capture rate after results are shown, because email capture before value would inflate leads but damage trust.

I would instrument the form start, audit complete, per-tool stack composition, total monthly spend, total monthly savings, email capture, public share URL creation, Credex CTA click, and consultation booking. I would also track fallback-summary usage to know whether the LLM integration is quietly failing.

The pivot trigger is two consecutive weeks with at least 200 completed audits but fewer than 3% high-savings audits or fewer than 10% post-audit email captures. That would mean the tool is either attracting users with too little spend, the audit logic is not finding painful enough problems, or the value proposition is framed too broadly.
