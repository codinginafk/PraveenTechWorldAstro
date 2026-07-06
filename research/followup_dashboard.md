# 🎯 Job Application Follow-Up Dashboard

> [!info] 
> This dashboard automatically tracks your job applications. Any application whose `followup_date` is today or earlier will appear at the top.

## 🚨 Needs Follow Up

```dataview
TABLE role as "Position", status, date_applied as "Applied On", followup_date as "Follow Up By", email_sent as "Email"
FROM "01_Applications"
WHERE status = "applied" AND followup_date <= date(today)
SORT followup_date ASC
```

## ⏳ Waiting / Pending

```dataview
TABLE role as "Position", status, date_applied as "Applied On", followup_date as "Follow Up By"
FROM "01_Applications"
WHERE status = "applied" AND followup_date > date(today)
SORT followup_date ASC
```

## ✅ In Progress (Interviews)

```dataview
TABLE role as "Position", status, company
FROM "01_Applications"
WHERE status = "interview_scheduled" OR status = "interviewing"
```

## ❌ Closed (Rejected / Ghosted / Offered)

```dataview
TABLE role as "Position", status, company
FROM "01_Applications"
WHERE status = "rejected" OR status = "ghosted" OR status = "offered"
```
