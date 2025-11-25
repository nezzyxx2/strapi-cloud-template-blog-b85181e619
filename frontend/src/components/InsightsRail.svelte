<script>
  export let posts = [];
</script>

<section id="insights" class="section insights">
  <div class="section__inner">
    <div class="insights__header">
      <p class="eyebrow">Insights</p>
      <h2>Notes from the studio</h2>
    </div>
    <div class="insights__track">
      {#each posts as post}
        <a href={post.link} class="panel insights__card">
          <span class="tag">{post.tag}</span>
          <h3>{post.title}</h3>
        </a>
      {/each}
    </div>
  </div>
</section>

<style>
  .insights__track {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1rem;
  }

  .insights__card {
    text-decoration: none;
    color: inherit;
    transition: transform 200ms ease;
  }

  .insights__card:hover {
    transform: translateY(-6px);
  }

  .insights__card h3 {
    margin-top: 1rem;
  }
</style>
