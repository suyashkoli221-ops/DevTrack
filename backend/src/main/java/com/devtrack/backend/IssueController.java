
package com.devtrack.backend;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/issues")
@CrossOrigin(origins = "http://localhost:5173")
public class IssueController {

    private final JdbcTemplate jdbc;

    public IssueController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping
    public List<Issue> getAllIssues() {
        return jdbc.query(
            "SELECT * FROM issues ORDER BY id DESC",
            (rs, rowNum) -> new Issue(
                rs.getLong("id"),
                rs.getString("title"),
                rs.getString("description"),
                rs.getString("status"),
                rs.getString("priority"),
                rs.getString("assignee"),
                rs.getString("reporter"),
                rs.getString("created_at")
            )
        );
    }

    @GetMapping("/analytics")
    public Map<String, Object> getAnalytics() {
        Map<String, Object> analytics = new LinkedHashMap<>();

        Integer total = jdbc.queryForObject(
            "SELECT COUNT(*) FROM issues", Integer.class
        );

        Integer open = jdbc.queryForObject(
            "SELECT COUNT(*) FROM issues WHERE status = 'Open'",
            Integer.class
        );

        Integer inProgress = jdbc.queryForObject(
            "SELECT COUNT(*) FROM issues WHERE status = 'In Progress'",
            Integer.class
        );

        Integer inReview = jdbc.queryForObject(
            "SELECT COUNT(*) FROM issues WHERE status = 'In Review'",
            Integer.class
        );

        Integer resolved = jdbc.queryForObject(
            "SELECT COUNT(*) FROM issues WHERE status = 'Resolved'",
            Integer.class
        );

        Map<String, Integer> statuses = new LinkedHashMap<>();
        statuses.put("Open", open);
        statuses.put("In Progress", inProgress);
        statuses.put("In Review", inReview);
        statuses.put("Resolved", resolved);

        Map<String, Integer> priorities = new LinkedHashMap<>();

        for (String priority : List.of(
                "Critical", "High", "Medium", "Low")) {
            Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM issues WHERE priority = ?",
                Integer.class,
                priority
            );

            priorities.put(priority, count);
        }

        List<Map<String, Object>> dailyActivity = jdbc.queryForList(
            """
            SELECT DATE(created_at) AS day, COUNT(*) AS count
            FROM issues
            WHERE DATE(created_at) >= DATE('now', '-6 days')
            GROUP BY DATE(created_at)
            ORDER BY DATE(created_at)
            """
        );

        analytics.put("total", total);
        analytics.put("statuses", statuses);
        analytics.put("priorities", priorities);
        analytics.put("dailyActivity", dailyActivity);

        return analytics;
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getIssue(@PathVariable Long id) {
        List<Issue> results = jdbc.query(
            "SELECT * FROM issues WHERE id = ?",
            (rs, rowNum) -> new Issue(
                rs.getLong("id"),
                rs.getString("title"),
                rs.getString("description"),
                rs.getString("status"),
                rs.getString("priority"),
                rs.getString("assignee"),
                rs.getString("reporter"),
                rs.getString("created_at")
            ),
            id
        );

        if (results.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(results.get(0));
    }

    @PostMapping
    public ResponseEntity<?> createIssue(@RequestBody Issue issue) {
        if (issue.getTitle() == null ||
            issue.getTitle().isBlank()) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Issue title is required"));
        }

        String status = issue.getStatus() == null ||
            issue.getStatus().isBlank()
            ? "Open" : issue.getStatus();

        String priority = issue.getPriority() == null ||
            issue.getPriority().isBlank()
            ? "Medium" : issue.getPriority();

        jdbc.update(
            """
            INSERT INTO issues
            (title, description, status, priority, assignee, reporter)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            issue.getTitle().trim(),
            issue.getDescription(),
            status,
            priority,
            issue.getAssignee(),
            issue.getReporter()
        );

        Long id = jdbc.queryForObject(
            "SELECT last_insert_rowid()",
            Long.class
        );

        return ResponseEntity.status(HttpStatus.CREATED)
            .body(Map.of("id", id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateIssue(
            @PathVariable Long id,
            @RequestBody Issue issue) {

        int updated = jdbc.update(
            """
            UPDATE issues
            SET title = ?, description = ?, status = ?,
                priority = ?, assignee = ?, reporter = ?
            WHERE id = ?
            """,
            issue.getTitle(),
            issue.getDescription(),
            issue.getStatus(),
            issue.getPriority(),
            issue.getAssignee(),
            issue.getReporter(),
            id
        );

        if (updated == 0) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(
            Map.of("message", "Issue updated")
        );
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteIssue(@PathVariable Long id) {
        int deleted = jdbc.update(
            "DELETE FROM issues WHERE id = ?", id
        );

        if (deleted == 0) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(
            Map.of("message", "Issue deleted")
        );
    }
}
